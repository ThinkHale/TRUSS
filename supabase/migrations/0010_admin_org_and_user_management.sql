-- ============================================================================
-- TRUSS 0010 — The operator actions 0008 left out
-- ============================================================================
-- 0008 could create a tenant, move its plan, grant access, and manage its
-- roster. It could not rename one, delete one, or answer the question an
-- operator asks most often: which company is this person with?
--
-- Same shape as 0008: every mutation is SECURITY DEFINER, checks authority
-- itself, and writes its audit row in the same transaction.

-- ─── Rename ─────────────────────────────────────────────────────────────────

create or replace function admin_update_organization(
  p_org  uuid,
  p_name text,
  p_slug text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text := btrim(p_name);
  v_slug   text := nullif(btrim(lower(coalesce(p_slug, ''))), '');
  v_before record;
begin
  perform require_platform_admin();

  select name, slug into v_before from organizations where id = p_org;
  if v_before is null then
    raise exception 'No such organization.' using errcode = '23503';
  end if;

  if v_name = '' or v_name is null then
    raise exception 'A company name is required.' using errcode = '22023';
  end if;
  if length(v_name) > 200 then
    raise exception 'That company name is too long.' using errcode = '22023';
  end if;

  if v_slug is not null then
    if v_slug !~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$' then
      raise exception 'A slug is 3-60 characters of lowercase letters, numbers, and dashes.'
        using errcode = '22023';
    end if;
    if exists (select 1 from organizations where slug = v_slug and id <> p_org) then
      raise exception 'That slug is already taken.' using errcode = '23505';
    end if;
  end if;

  update organizations
  set name = v_name,
      slug = coalesce(v_slug, slug),
      updated_at = now()
  where id = p_org;

  perform log_admin_action('org.update', p_org, null,
    jsonb_build_object('name_from', v_before.name, 'name_to', v_name,
                       'slug_from', v_before.slug, 'slug_to', coalesce(v_slug, v_before.slug)));
end;
$$;

-- ─── Delete ─────────────────────────────────────────────────────────────────
-- Every tenant table references organizations with ON DELETE CASCADE, so this
-- takes the company's accounts, conversations, scorecards, knowledge base and
-- usage history with it. There is no undo.
--
-- Two guards, both in SQL so the application cannot skip them:
--
--   The caller must retype the company name. An operator who is on the wrong
--   tab cannot delete the wrong tenant by clicking.
--
--   A company with live billing is refused. Deleting the tenant would strand a
--   Stripe subscription that keeps charging a customer whose account is gone.

create or replace function admin_delete_organization(
  p_org          uuid,
  p_confirm_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org record;
begin
  perform require_platform_admin();

  select id, name, subscription_status, stripe_subscription_id
    into v_org
  from organizations where id = p_org;

  if v_org is null then
    raise exception 'No such organization.' using errcode = '23503';
  end if;

  if lower(btrim(coalesce(p_confirm_name, ''))) <> lower(btrim(v_org.name)) then
    raise exception 'Type the company name exactly to confirm deletion.'
      using errcode = '22023';
  end if;

  if v_org.stripe_subscription_id is not null
     and coalesce(v_org.subscription_status, '') in ('active', 'trialing', 'past_due') then
    raise exception 'This company has a live Stripe subscription. Cancel it in Stripe first, or it will keep billing.'
      using errcode = '23514';
  end if;

  -- Logged before the delete: target_org is ON DELETE SET NULL, so the id has
  -- to be carried in the detail payload to survive the row going away.
  perform log_admin_action('org.delete', p_org, null,
    jsonb_build_object('org_id', p_org, 'name', v_org.name,
                       'members', (select count(*) from memberships where org_id = p_org)));

  delete from organizations where id = p_org;
end;
$$;

-- ─── Which company is this person with ──────────────────────────────────────
-- The reverse of admin_org_members(). Returns one row per membership, plus the
-- flag for which org the person actually lands in when they sign in.

create or replace function admin_user_orgs(p_user uuid)
returns table (
  org_id     uuid,
  org_name   text,
  org_slug   text,
  plan       org_plan,
  effective  org_plan,
  role       org_role,
  is_active  boolean,
  joined_at  timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform require_platform_admin();

  return query
  select o.id,
         o.name,
         o.slug,
         o.plan,
         effective_plan(o.id),
         m.role,
         (p.active_org_id = o.id),
         m.created_at
  from memberships m
  join organizations o on o.id = m.org_id
  left join profiles p on p.id = m.user_id
  where m.user_id = p_user
  order by (p.active_org_id = o.id) desc, o.name;
end;
$$;

create or replace function admin_user_detail(p_user uuid)
returns table (
  id              uuid,
  email           text,
  full_name       text,
  phone           text,
  locale          text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  active_org_id   uuid,
  is_operator     boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform require_platform_admin();

  return query
  select u.id,
         u.email::text,
         p.full_name,
         p.phone,
         p.locale,
         u.created_at,
         u.last_sign_in_at,
         p.active_org_id,
         exists (select 1 from platform_admins pa where pa.user_id = u.id)
  from auth.users u
  left join profiles p on p.id = u.id
  where u.id = p_user;
end;
$$;

-- Someone in more than one org lands in whichever their profile points at.
-- This is how an operator moves them, and how a person whose active org was
-- deleted gets put back somewhere real instead of being sent to onboarding.
create or replace function admin_set_active_org(p_user uuid, p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_admin();

  if not exists (select 1 from memberships where org_id = p_org and user_id = p_user) then
    raise exception 'That person is not a member of that company.' using errcode = '23503';
  end if;

  update profiles set active_org_id = p_org, updated_at = now() where id = p_user;

  perform log_admin_action('user.set_active_org', p_org, p_user, '{}'::jsonb);
end;
$$;

-- ─── The people list, now carrying company ──────────────────────────────────
-- Dropped rather than replaced: the return type gains a column, and
-- CREATE OR REPLACE cannot change the shape of a table-returning function.

drop function if exists admin_find_users(text, integer);

create or replace function admin_find_users(p_query text, p_limit integer default 20)
returns table (
  id              uuid,
  email           text,
  full_name       text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  is_operator     boolean,
  orgs            jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query text := '%' || btrim(coalesce(p_query, '')) || '%';
begin
  perform require_platform_admin();

  return query
  select u.id,
         u.email::text,
         p.full_name,
         u.created_at,
         u.last_sign_in_at,
         exists (select 1 from platform_admins pa where pa.user_id = u.id),
         coalesce(
           (select jsonb_agg(jsonb_build_object(
                     'id',     o.id,
                     'name',   o.name,
                     'role',   m.role,
                     'active', (p.active_org_id = o.id))
                   order by (p.active_org_id = o.id) desc, o.name)
            from memberships m
            join organizations o on o.id = m.org_id
            where m.user_id = u.id),
           '[]'::jsonb)
  from auth.users u
  left join profiles p on p.id = u.id
  where btrim(coalesce(p_query, '')) = ''
     or u.email ilike v_query
     or p.full_name ilike v_query
     -- Searching by company is how you find "everyone at Apex", which is the
     -- other direction an operator looks people up from.
     or exists (
          select 1 from memberships m2
          join organizations o2 on o2.id = m2.org_id
          where m2.user_id = u.id and o2.name ilike v_query
        )
  order by u.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
end;
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────

revoke all on function admin_update_organization(uuid, text, text) from public, anon;
revoke all on function admin_delete_organization(uuid, text)       from public, anon;
revoke all on function admin_user_orgs(uuid)                        from public, anon;
revoke all on function admin_user_detail(uuid)                      from public, anon;
revoke all on function admin_set_active_org(uuid, uuid)             from public, anon;
revoke all on function admin_find_users(text, integer)              from public, anon;

grant execute on function admin_update_organization(uuid, text, text) to authenticated;
grant execute on function admin_delete_organization(uuid, text)       to authenticated;
grant execute on function admin_user_orgs(uuid)                        to authenticated;
grant execute on function admin_user_detail(uuid)                      to authenticated;
grant execute on function admin_set_active_org(uuid, uuid)             to authenticated;
grant execute on function admin_find_users(text, integer)              to authenticated;
