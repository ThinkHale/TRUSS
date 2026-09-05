-- ============================================================================
-- TRUSS 0008 — Platform administration
-- ============================================================================
-- Everything above this migration is tenant-scoped: a user sees their org and
-- nothing else, enforced in the database. This adds the one role that sits
-- above tenancy — the operator of the platform — and it does so by widening the
-- existing isolation helpers rather than by handing the application a key that
-- bypasses Row Level Security.
--
-- That distinction is the whole design. A platform admin gets their reach from
-- RLS, so every policy written in 0001–0007 still applies to them, including
-- the one that matters most:
--
--   coach_conversations is gated on `user_id = auth.uid()`.
--
-- A platform admin has no membership row and is not the author of anybody's
-- Coach conversation, so widening is_org_member() does not open Coach history.
-- The promise ENTERPRISE.md makes to reps — that nobody reads their Coach
-- conversations — continues to hold for the operator too. It stops holding the
-- moment someone queries with the service-role key, which is why the admin
-- panel uses the caller's own client for everything except auth.users lookups.

-- ─── Who operates the platform ──────────────────────────────────────────────

create table platform_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  note        text,
  granted_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table platform_admins is
  'Operators of TRUSS itself, above org tenancy. Membership here is checked by is_platform_admin() and widens the RLS helpers in 0001.';

-- SECURITY DEFINER for the same reason the 0001 helpers are: policies on
-- platform_admins call this, and it must not recurse through the policy being
-- evaluated. Stable so a single statement evaluates it once.
create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$;

-- ─── Widen the isolation helpers ────────────────────────────────────────────
-- Redefining these three reaches every policy in 0001–0007 at once: 35 of the
-- 36 policies in the schema are written in terms of them. The alternative —
-- editing each policy — would leave the next table someone adds behind.

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_platform_admin() or exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid()
  );
$$;

-- A platform admin reads as an owner to every role-gated policy. Without this
-- the eleven policies written as org_role_of(...) in ('owner','admin','manager')
-- would still exclude them, since they hold no membership row.
create or replace function org_role_of(target_org uuid)
returns org_role
language sql
stable
security definer
set search_path = public
as $$
  select case
    when is_platform_admin() then 'owner'::org_role
    else (select role from memberships where org_id = target_org and user_id = auth.uid())
  end;
$$;

create or replace function is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_platform_admin()
     or coalesce(org_role_of(target_org) in ('owner', 'admin'), false);
$$;

-- ─── Access granted outside of billing ──────────────────────────────────────
-- An override is how an org gets full access without paying: a pilot, a design
-- partner, a support gesture, a customer mid-migration from an offline
-- contract. It is deliberately separate from `plan` so that the Stripe webhook
-- and a human operator never fight over the same column — the webhook owns
-- `plan`, an operator owns `plan_override`, and the override wins while it
-- lasts. Cancelling a subscription therefore cannot silently revoke a grant,
-- and expiring a grant cannot silently revoke a subscription.

alter table organizations
  add column plan_override       org_plan,
  add column override_expires_at timestamptz,
  add column override_reason     text,
  add column override_granted_by uuid references auth.users (id) on delete set null,
  add column override_granted_at timestamptz;

comment on column organizations.plan_override is
  'Operator-granted plan that outranks the billed plan until override_expires_at. Null expiry means it does not expire.';

-- The plan the app should actually enforce. Every quota check goes through
-- this, so a grant takes effect everywhere at once with no route changes.
create or replace function effective_plan(target_org uuid)
returns org_plan
language sql
stable
security definer
set search_path = public
as $$
  select case
    when o.plan_override is not null
     and (o.override_expires_at is null or o.override_expires_at > now())
    then o.plan_override
    else o.plan
  end
  from organizations o
  where o.id = target_org;
$$;

comment on function effective_plan(uuid) is
  'The plan in force for an org: the operator override while it is live, otherwise the billed plan.';

-- Rewritten from 0006 to read effective_plan rather than organizations.plan.
-- The body is otherwise unchanged.
create or replace function within_quota(target_org uuid, event_kind text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  org_plan_value org_plan;
  ent            plan_entitlements%rowtype;
  usage          usage_counters%rowtype;
  month_start    date := date_trunc('month', now())::date;
begin
  org_plan_value := effective_plan(target_org);
  if org_plan_value is null then return false; end if;

  select * into ent from plan_entitlements where plan = org_plan_value;
  select * into usage from usage_counters
    where org_id = target_org and period_month = month_start;

  -- No usage yet this month means nothing has been consumed.
  if usage is null then return true; end if;

  return case event_kind
    when 'coach_message' then
      ent.monthly_coach_messages is null or usage.coach_messages < ent.monthly_coach_messages
    when 'practice_seconds' then
      ent.monthly_practice_minutes is null
        or usage.practice_seconds < ent.monthly_practice_minutes * 60
    when 'research_brief' then
      ent.monthly_research_briefs is null or usage.research_briefs < ent.monthly_research_briefs
    else true
  end;
end;
$$;

-- ─── Audit ──────────────────────────────────────────────────────────────────
-- Anything done with platform authority is written down. This is the record
-- that makes a superadmin role defensible to an Enterprise customer asking who
-- can touch their tenant.

create table admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_email text,
  action      text not null,
  target_org  uuid references organizations (id) on delete set null,
  target_user uuid references auth.users (id) on delete set null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index admin_audit_log_created_idx on admin_audit_log (created_at desc);
create index admin_audit_log_org_idx     on admin_audit_log (target_org, created_at desc);

create or replace function log_admin_action(
  p_action      text,
  p_target_org  uuid default null,
  p_target_user uuid default null,
  p_detail      jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into admin_audit_log (actor_id, actor_email, action, target_org, target_user, detail)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    p_action,
    p_target_org,
    p_target_user,
    coalesce(p_detail, '{}'::jsonb)
  );
end;
$$;

-- ─── Operator actions ───────────────────────────────────────────────────────
-- Every privileged mutation is a function that checks authority and writes an
-- audit row in the same transaction. Putting the check here rather than in the
-- route handler means a mistake in the application cannot skip it, and means
-- these are safe to call with the caller's own (RLS-bound) client.

create or replace function require_platform_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;
  if not is_platform_admin() then
    raise exception 'Platform administration is restricted.' using errcode = '42501';
  end if;
end;
$$;

-- Creates a tenant outright, with no signup flow and no owner yet. This is the
-- Enterprise path: the org exists, is configured, and is waiting for its people.
create or replace function admin_create_organization(
  p_name           text,
  p_plan           org_plan default 'enterprise',
  p_seat_limit     integer default null,
  p_trades         text[] default '{}',
  p_service_area   text[] default '{}',
  p_playbook_rules text[] default '{}',
  p_default_locale text default 'en'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(p_name);
  v_base text;
  v_slug text;
  v_org  uuid;
begin
  perform require_platform_admin();

  if v_name is null or v_name = '' then
    raise exception 'A company name is required.' using errcode = '22023';
  end if;
  if length(v_name) > 200 then
    raise exception 'That company name is too long.' using errcode = '22023';
  end if;
  if p_default_locale not in ('en', 'es') then
    raise exception 'Locale must be en or es.' using errcode = '22023';
  end if;

  v_base := nullif(btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-'), '');
  v_base := coalesce(left(v_base, 40), 'company');

  loop
    v_slug := v_base || '-' || encode(extensions.gen_random_bytes(3), 'hex');
    exit when not exists (select 1 from organizations where slug = v_slug);
  end loop;

  insert into organizations (name, slug, plan, seat_limit)
  values (v_name, v_slug, p_plan, p_seat_limit)
  returning id into v_org;

  insert into org_settings (org_id, trades, service_area, playbook_rules, default_locale)
  values (v_org,
          coalesce(p_trades, '{}'),
          coalesce(p_service_area, '{}'),
          coalesce(p_playbook_rules, '{}'),
          p_default_locale);

  perform log_admin_action('org.create', v_org, null,
    jsonb_build_object('name', v_name, 'plan', p_plan, 'seat_limit', p_seat_limit));

  return v_org;
end;
$$;

-- Sets the billed plan directly. Used for offline Enterprise contracts, and to
-- correct a tenant whose Stripe state and TRUSS state have drifted.
create or replace function admin_set_org_plan(
  p_org        uuid,
  p_plan       org_plan,
  p_seat_limit integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before org_plan;
begin
  perform require_platform_admin();

  select plan into v_before from organizations where id = p_org;
  if v_before is null then
    raise exception 'No such organization.' using errcode = '23503';
  end if;

  update organizations
  set plan = p_plan,
      seat_limit = coalesce(p_seat_limit, seat_limit),
      updated_at = now()
  where id = p_org;

  perform log_admin_action('org.set_plan', p_org, null,
    jsonb_build_object('from', v_before, 'to', p_plan, 'seat_limit', p_seat_limit));
end;
$$;

-- Grants or clears full access independent of billing. p_plan null clears it.
create or replace function admin_set_override(
  p_org        uuid,
  p_plan       org_plan default null,
  p_expires_at timestamptz default null,
  p_reason     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_admin();

  if not exists (select 1 from organizations where id = p_org) then
    raise exception 'No such organization.' using errcode = '23503';
  end if;

  update organizations
  set plan_override       = p_plan,
      override_expires_at = case when p_plan is null then null else p_expires_at end,
      override_reason     = case when p_plan is null then null else p_reason end,
      override_granted_by = case when p_plan is null then null else auth.uid() end,
      override_granted_at = case when p_plan is null then null else now() end,
      updated_at          = now()
  where id = p_org;

  perform log_admin_action(
    case when p_plan is null then 'org.clear_override' else 'org.set_override' end,
    p_org, null,
    jsonb_build_object('plan', p_plan, 'expires_at', p_expires_at, 'reason', p_reason));
end;
$$;

-- Adds a user to an org, or changes the role they already hold there.
create or replace function admin_upsert_membership(
  p_org  uuid,
  p_user uuid,
  p_role org_role default 'rep'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before org_role;
begin
  perform require_platform_admin();

  if not exists (select 1 from organizations where id = p_org) then
    raise exception 'No such organization.' using errcode = '23503';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'No such user.' using errcode = '23503';
  end if;

  select role into v_before from memberships where org_id = p_org and user_id = p_user;

  insert into memberships (org_id, user_id, role)
  values (p_org, p_user, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  -- A user with no active org lands nowhere after signing in, so adopt this one.
  update profiles set active_org_id = p_org, updated_at = now()
  where id = p_user and active_org_id is null;

  perform log_admin_action(
    case when v_before is null then 'member.add' else 'member.set_role' end,
    p_org, p_user,
    jsonb_build_object('from', v_before, 'to', p_role));
end;
$$;

create or replace function admin_remove_membership(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role org_role;
begin
  perform require_platform_admin();

  select role into v_role from memberships where org_id = p_org and user_id = p_user;
  if v_role is null then return; end if;

  -- Removing the last owner would leave the tenant unadministrable by its own
  -- people. Change someone else to owner first.
  if v_role = 'owner' and (
    select count(*) from memberships where org_id = p_org and role = 'owner'
  ) <= 1 then
    raise exception 'That is the only owner of this organization.' using errcode = '23514';
  end if;

  delete from memberships where org_id = p_org and user_id = p_user;

  -- Move them off the org they can no longer see, to any org they still hold.
  update profiles
  set active_org_id = (
        select m.org_id from memberships m where m.user_id = p_user limit 1
      ),
      updated_at = now()
  where id = p_user and active_org_id = p_org;

  perform log_admin_action('member.remove', p_org, p_user,
    jsonb_build_object('role', v_role));
end;
$$;

-- Promotes or demotes another operator. Kept in SQL so the audit row and the
-- change are one transaction, and so the last operator cannot delete themselves.
create or replace function admin_set_platform_admin(
  p_user  uuid,
  p_admin boolean,
  p_note  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_admin();

  if p_admin then
    insert into platform_admins (user_id, note, granted_by)
    values (p_user, p_note, auth.uid())
    on conflict (user_id) do update set note = coalesce(excluded.note, platform_admins.note);
    perform log_admin_action('platform_admin.grant', null, p_user, jsonb_build_object('note', p_note));
  else
    if (select count(*) from platform_admins) <= 1 then
      raise exception 'That is the only platform administrator.' using errcode = '23514';
    end if;
    delete from platform_admins where user_id = p_user;
    perform log_admin_action('platform_admin.revoke', null, p_user, '{}'::jsonb);
  end if;
end;
$$;

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table platform_admins enable row level security;
alter table admin_audit_log enable row level security;

-- A user may see whether they themselves are an operator — the app needs that
-- to decide whether to render the admin entry point — and operators see all.
create policy platform_admins_read on platform_admins
  for select using (user_id = auth.uid() or is_platform_admin());

-- No write policy: membership changes go through admin_set_platform_admin(),
-- which is SECURITY DEFINER and checks authority itself.

create policy admin_audit_read on admin_audit_log
  for select using (is_platform_admin());

-- ─── Grants ─────────────────────────────────────────────────────────────────

revoke all on function admin_create_organization(text, org_plan, integer, text[], text[], text[], text) from public, anon;
revoke all on function admin_set_org_plan(uuid, org_plan, integer)                                      from public, anon;
revoke all on function admin_set_override(uuid, org_plan, timestamptz, text)                            from public, anon;
revoke all on function admin_upsert_membership(uuid, uuid, org_role)                                    from public, anon;
revoke all on function admin_remove_membership(uuid, uuid)                                              from public, anon;
revoke all on function admin_set_platform_admin(uuid, boolean, text)                                    from public, anon;
revoke all on function log_admin_action(text, uuid, uuid, jsonb)                                        from public, anon;
revoke all on function require_platform_admin()                                                         from public, anon;

grant execute on function admin_create_organization(text, org_plan, integer, text[], text[], text[], text) to authenticated;
grant execute on function admin_set_org_plan(uuid, org_plan, integer)                                      to authenticated;
grant execute on function admin_set_override(uuid, org_plan, timestamptz, text)                            to authenticated;
grant execute on function admin_upsert_membership(uuid, uuid, org_role)                                    to authenticated;
grant execute on function admin_remove_membership(uuid, uuid)                                              to authenticated;
grant execute on function admin_set_platform_admin(uuid, boolean, text)                                    to authenticated;
grant execute on function is_platform_admin()                                                              to authenticated;
grant execute on function effective_plan(uuid)                                                             to authenticated;

-- ─── Operator directory ─────────────────────────────────────────────────────
-- The console needs to look people up by email, and email lives in auth.users,
-- which PostgREST does not expose and RLS cannot reach. The alternative would
-- be handing the console the service-role key; these three functions are the
-- reason it never gets one. Each checks platform authority itself and returns
-- only the columns an operator screen actually renders.

create or replace function admin_find_users(p_query text, p_limit integer default 20)
returns table (
  id              uuid,
  email           text,
  full_name       text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  is_operator     boolean
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
         exists (select 1 from platform_admins pa where pa.user_id = u.id)
  from auth.users u
  left join profiles p on p.id = u.id
  where btrim(coalesce(p_query, '')) = ''
     or u.email ilike v_query
     or p.full_name ilike v_query
  order by u.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
end;
$$;

create or replace function admin_find_user_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform require_platform_admin();

  select u.id into v_id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
  limit 1;

  return v_id;
end;
$$;

create or replace function admin_org_members(p_org uuid)
returns table (
  user_id    uuid,
  email      text,
  full_name  text,
  role       org_role,
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
  select m.user_id,
         u.email::text,
         p.full_name,
         m.role,
         m.created_at
  from memberships m
  join auth.users u on u.id = m.user_id
  left join profiles p on p.id = m.user_id
  where m.org_id = p_org
  order by
    case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 else 3 end,
    u.email;
end;
$$;

-- One row per tenant with the numbers an operator triages on. Written as a
-- function rather than a view so the platform check travels with it.
create or replace function admin_org_overview(p_query text default '', p_limit integer default 50)
returns table (
  id                   uuid,
  name                 text,
  slug                 text,
  plan                 org_plan,
  plan_override        org_plan,
  override_expires_at  timestamptz,
  effective            org_plan,
  subscription_status  text,
  cancel_at_period_end boolean,
  current_period_end   timestamptz,
  seat_limit           integer,
  members              integer,
  coach_messages       integer,
  created_at           timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query text := '%' || btrim(coalesce(p_query, '')) || '%';
  v_month date := date_trunc('month', now())::date;
begin
  perform require_platform_admin();

  return query
  select o.id,
         o.name,
         o.slug,
         o.plan,
         o.plan_override,
         o.override_expires_at,
         effective_plan(o.id),
         o.subscription_status,
         o.cancel_at_period_end,
         o.current_period_end,
         o.seat_limit,
         (select count(*)::integer from memberships m where m.org_id = o.id),
         coalesce((select uc.coach_messages from usage_counters uc
                   where uc.org_id = o.id and uc.period_month = v_month), 0),
         o.created_at
  from organizations o
  where btrim(coalesce(p_query, '')) = ''
     or o.name ilike v_query
     or o.slug ilike v_query
  order by o.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

revoke all on function admin_find_users(text, integer)        from public, anon;
revoke all on function admin_find_user_by_email(text)         from public, anon;
revoke all on function admin_org_members(uuid)                from public, anon;
revoke all on function admin_org_overview(text, integer)      from public, anon;

grant execute on function admin_find_users(text, integer)     to authenticated;
grant execute on function admin_find_user_by_email(text)      to authenticated;
grant execute on function admin_org_members(uuid)             to authenticated;
grant execute on function admin_org_overview(text, integer)   to authenticated;
