-- ============================================================================
-- TRUSS 0021 — A company can run its own roster, and sign in the way it signs in
-- ============================================================================
-- Until now the only way anyone joined a company was through a TRUSS operator
-- in /admin. That does not survive contact with a 300-rep contractor with
-- ordinary turnover: they hire on Monday and let people go on Friday, and they
-- will not email us each time. This gives a company's owners and admins the
-- roster, with the same shape the operator functions have — authority checked
-- in SQL, an audit row in the same transaction.
--
-- Adding someone who already has a TRUSS account never happens silently. They
-- get an invitation and accept it themselves; a company cannot pull a person's
-- account into its tenant, where its managers would read their practice
-- history, without that person saying yes. Someone with no account yet gets one
-- created by the invite, which is itself their acceptance of that company.
--
-- Email domains are the other door in: an operator records that a company owns
-- a domain, and anyone who signs in with a confirmed address at that domain
-- joins it. That is also where "SSO required" is recorded, so a company that
-- signs in through its identity provider can stop password sign-ins for its
-- own people.

-- ─── The directory ──────────────────────────────────────────────────────────
-- Email lives in auth.users, which RLS cannot reach and PostgREST does not
-- expose. A company's managers need it to know who is who.

create or replace function org_member_directory(p_org uuid)
returns table (
  user_id         uuid,
  email           text,
  full_name       text,
  role            org_role,
  branch_id       uuid,
  branch_name     text,
  joined_at       timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(org_role_of(p_org) in ('owner', 'admin', 'manager'), false) is not true then
    raise exception 'Only managers can see the company directory.' using errcode = '42501';
  end if;

  return query
  select m.user_id, u.email::text, p.full_name, m.role, m.branch_id, b.name, m.created_at, u.last_sign_in_at
  from memberships m
  join auth.users u on u.id = m.user_id
  left join profiles p on p.id = m.user_id
  left join branches b on b.id = m.branch_id
  where m.org_id = p_org
  order by case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 else 3 end,
           coalesce(p.full_name, u.email::text);
end;
$$;

-- ─── Invitations ────────────────────────────────────────────────────────────

alter table invitations
  add column branch_id uuid,
  add constraint invitations_branch_fk foreign key (branch_id, org_id)
    references branches (id, org_id) on delete set null (branch_id);

-- Invites a person, or refreshes a pending invite. Returns whether they already
-- have an account, so the caller knows whether an email needs sending.
create or replace function org_invite(
  p_org    uuid,
  p_email  text,
  p_role   org_role default 'rep',
  p_branch uuid default null
)
returns table (invitation_id uuid, existing_user boolean, already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_user    uuid;
  v_limit   integer;
  v_used    integer;
  v_id      uuid;
begin
  if not is_org_admin(p_org) then
    raise exception 'Only owners and admins can invite people.' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'That is not an email address.' using errcode = '22023';
  end if;
  -- Handing someone ownership is an owner's decision.
  if p_role = 'owner' and coalesce(org_role_of(p_org) = 'owner', false) is not true then
    raise exception 'Only an owner can invite another owner.' using errcode = '42501';
  end if;

  select u.id into v_user from auth.users u where lower(u.email) = v_email limit 1;

  if v_user is not null and exists (select 1 from memberships where org_id = p_org and user_id = v_user) then
    return query select null::uuid, true, true;
    return;
  end if;

  -- Seats count people already in plus invitations still open, so a company
  -- cannot invite past its limit and let the first N to accept win.
  select seat_limit into v_limit from organizations where id = p_org;
  if v_limit is not null then
    select (select count(*) from memberships where org_id = p_org)
         + (select count(*) from invitations
            where org_id = p_org and accepted_at is null and expires_at > now() and lower(email) <> v_email)
      into v_used;
    if v_used >= v_limit then
      raise exception 'Every seat is taken. Remove someone or add seats first.' using errcode = '23514';
    end if;
  end if;

  insert into invitations (org_id, email, role, branch_id, invited_by)
  values (p_org, v_email, p_role, p_branch, auth.uid())
  on conflict (org_id, email) do update
    set role = excluded.role,
        branch_id = excluded.branch_id,
        invited_by = excluded.invited_by,
        accepted_at = null,
        expires_at = now() + interval '14 days',
        token = encode(extensions.gen_random_bytes(24), 'hex')
  returning id into v_id;

  perform log_org_action(p_org, 'member.invite', v_user,
    jsonb_build_object('email', v_email, 'role', p_role, 'branch_id', p_branch));

  return query select v_id, v_user is not null, false;
end;
$$;

create or replace function org_cancel_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv invitations%rowtype;
begin
  select * into v_inv from invitations where id = p_invitation;
  if v_inv.id is null then return; end if;
  if not is_org_admin(v_inv.org_id) then
    raise exception 'Only owners and admins can cancel invitations.' using errcode = '42501';
  end if;
  delete from invitations where id = p_invitation and accepted_at is null;
  perform log_org_action(v_inv.org_id, 'member.invite_cancel', null, jsonb_build_object('email', v_inv.email));
end;
$$;

-- The invitee's side. Matched on the address of their own confirmed account,
-- never on anything the caller passes in.
create or replace function my_invitations()
returns table (
  invitation_id uuid,
  org_id        uuid,
  org_name      text,
  role          org_role,
  invited_at    timestamptz,
  expires_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.org_id, o.name, i.role, i.created_at, i.expires_at
  from invitations i
  join organizations o on o.id = i.org_id
  join auth.users u on u.id = auth.uid()
  where lower(i.email) = lower(u.email)
    and u.email_confirmed_at is not null
    and i.accepted_at is null
    and i.expires_at > now()
    and not exists (select 1 from memberships m where m.org_id = i.org_id and m.user_id = auth.uid())
  order by i.created_at desc;
$$;

create or replace function accept_invitation(p_invitation uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv   invitations%rowtype;
  v_email text;
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  select lower(email) into v_email from auth.users
  where id = auth.uid() and email_confirmed_at is not null;

  select * into v_inv from invitations where id = p_invitation for update;
  if v_inv.id is null or v_email is null or lower(v_inv.email) <> v_email then
    raise exception 'That invitation is not for this account.' using errcode = '42501';
  end if;
  if v_inv.accepted_at is not null then
    return v_inv.org_id;
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'That invitation has expired. Ask for a new one.' using errcode = '22023';
  end if;

  -- The invite already reserved a seat, but the limit may have been lowered.
  select seat_limit into v_limit from organizations where id = v_inv.org_id;
  if v_limit is not null and (select count(*) from memberships where org_id = v_inv.org_id) >= v_limit then
    raise exception 'That company has no seats left. Ask them to add one.' using errcode = '23514';
  end if;

  insert into memberships (org_id, user_id, role, branch_id)
  values (v_inv.org_id, auth.uid(), v_inv.role, v_inv.branch_id)
  on conflict (org_id, user_id) do nothing;

  update invitations set accepted_at = now() where id = p_invitation;

  -- Land them in the company they just joined.
  update profiles set active_org_id = v_inv.org_id, updated_at = now() where id = auth.uid();

  perform log_org_action(v_inv.org_id, 'member.join_invite', auth.uid(),
    jsonb_build_object('role', v_inv.role));

  return v_inv.org_id;
end;
$$;

-- Someone who belongs to no company at all and has an open invitation came here
-- to join it: either the invite created their account, or they signed up and
-- never set up a company. The server calls this before onboarding offers to
-- build one, so they land in the company that invited them without a second
-- click. Anyone who already belongs somewhere accepts by hand instead — joining
-- a second company changes whose managers can read their practice history.
create or replace function accept_invitations_for_new_account()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv      record;
  v_accepted integer := 0;
begin
  if auth.uid() is null then return 0; end if;
  -- Only an account that has never belonged anywhere.
  if exists (select 1 from memberships where user_id = auth.uid()) then return 0; end if;

  for v_inv in select * from my_invitations() order by invited_at loop
    begin
      perform accept_invitation(v_inv.invitation_id);
      v_accepted := v_accepted + 1;
    exception when others then
      -- A full company should not stop the next invitation from landing.
      null;
    end;
  end loop;
  return v_accepted;
end;
$$;

-- ─── Changing and removing people ───────────────────────────────────────────

create or replace function org_set_member(
  p_org    uuid,
  p_user   uuid,
  p_role   org_role,
  p_branch uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before memberships%rowtype;
  v_caller org_role := org_role_of(p_org);
begin
  if not is_org_admin(p_org) then
    raise exception 'Only owners and admins can change roles.' using errcode = '42501';
  end if;

  select * into v_before from memberships where org_id = p_org and user_id = p_user;
  if v_before.user_id is null then
    raise exception 'That person is not in this company.' using errcode = '23503';
  end if;

  if (p_role = 'owner' or v_before.role = 'owner') and p_role is distinct from v_before.role
     and v_caller <> 'owner' then
    raise exception 'Only an owner can change who owns the company.' using errcode = '42501';
  end if;
  if v_before.role = 'owner' and p_role <> 'owner'
     and (select count(*) from memberships where org_id = p_org and role = 'owner') <= 1 then
    raise exception 'That is the only owner. Make someone else an owner first.' using errcode = '23514';
  end if;

  update memberships set role = p_role, branch_id = p_branch
  where org_id = p_org and user_id = p_user;

  perform log_org_action(p_org, 'member.update', p_user,
    jsonb_build_object('role_from', v_before.role, 'role_to', p_role,
                       'branch_from', v_before.branch_id, 'branch_to', p_branch));
end;
$$;

create or replace function org_remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role org_role;
begin
  if not is_org_admin(p_org) then
    raise exception 'Only owners and admins can remove people.' using errcode = '42501';
  end if;

  select role into v_role from memberships where org_id = p_org and user_id = p_user;
  if v_role is null then return; end if;

  if v_role = 'owner' and coalesce(org_role_of(p_org) = 'owner', false) is not true then
    raise exception 'Only an owner can remove an owner.' using errcode = '42501';
  end if;
  if v_role = 'owner' and (select count(*) from memberships where org_id = p_org and role = 'owner') <= 1 then
    raise exception 'That is the only owner of this company.' using errcode = '23514';
  end if;

  delete from memberships where org_id = p_org and user_id = p_user;

  update profiles
  set active_org_id = (select m.org_id from memberships m where m.user_id = p_user order by m.created_at limit 1),
      updated_at = now()
  where id = p_user and active_org_id = p_org;

  perform log_org_action(p_org, 'member.remove', p_user, jsonb_build_object('role', v_role));
end;
$$;

-- ─── Email domains and SSO ──────────────────────────────────────────────────

create table org_domains (
  domain        text primary key
                  constraint org_domains_format check (domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  org_id        uuid not null references organizations (id) on delete cascade,
  -- Who someone joining by domain becomes. Never owner or admin: authority is
  -- granted by a person, not by an email address.
  default_role  org_role not null default 'rep' check (default_role in ('rep', 'manager')),
  auto_join     boolean not null default true,
  sso_required  boolean not null default false,
  -- Set by the operator once ownership of the domain is established.
  verified_at   timestamptz,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index org_domains_org_idx on org_domains (org_id);

alter table org_domains enable row level security;

create policy org_domains_read on org_domains
  for select using (is_org_admin(org_id));

revoke insert, update, delete on org_domains from authenticated, anon;

-- Public-mail domains can never be claimed, whatever an operator types.
create or replace function is_public_mail_domain(p_domain text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(p_domain) in (
    'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
    'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me',
    'protonmail.com', 'gmx.com', 'mail.com', 'zoho.com', 'yandex.com', 'comcast.net',
    'att.net', 'sbcglobal.net', 'verizon.net', 'cox.net', 'charter.net', 'bellsouth.net'
  );
$$;

create or replace function admin_set_org_domain(
  p_org          uuid,
  p_domain       text,
  p_default_role org_role default 'rep',
  p_auto_join    boolean default true,
  p_sso_required boolean default false,
  p_verified     boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(btrim(coalesce(p_domain, '')));
begin
  perform require_platform_admin();

  if is_public_mail_domain(v_domain) then
    raise exception 'A public email domain cannot belong to a company.' using errcode = '22023';
  end if;
  if exists (select 1 from org_domains where domain = v_domain and org_id <> p_org) then
    raise exception 'That domain already belongs to another company.' using errcode = '23505';
  end if;

  insert into org_domains (domain, org_id, default_role, auto_join, sso_required, verified_at, created_by)
  values (v_domain, p_org, p_default_role, p_auto_join, p_sso_required,
          case when p_verified then now() end, auth.uid())
  on conflict (domain) do update
    set default_role = excluded.default_role,
        auto_join    = excluded.auto_join,
        sso_required = excluded.sso_required,
        verified_at  = case when p_verified then coalesce(org_domains.verified_at, now()) end;

  perform log_admin_action('org.set_domain', p_org, null,
    jsonb_build_object('domain', v_domain, 'default_role', p_default_role, 'auto_join', p_auto_join,
                       'sso_required', p_sso_required, 'verified', p_verified));
end;
$$;

create or replace function admin_remove_org_domain(p_domain text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  perform require_platform_admin();
  delete from org_domains where domain = lower(btrim(p_domain)) returning org_id into v_org;
  if v_org is not null then
    perform log_admin_action('org.remove_domain', v_org, null, jsonb_build_object('domain', lower(btrim(p_domain))));
  end if;
end;
$$;

-- Joins the caller to the company that owns their confirmed email's domain.
-- Returns the org joined, or null. Called when a signed-in person has no
-- company, before onboarding offers to create one.
create or replace function join_by_email_domain()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email     text;
  v_domain    text;
  v_rule      org_domains%rowtype;
  v_limit     integer;
begin
  if auth.uid() is null then return null; end if;

  select lower(email) into v_email from auth.users
  where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then return null; end if;

  v_domain := split_part(v_email, '@', 2);
  select * into v_rule from org_domains
  where domain = v_domain and verified_at is not null and auto_join;
  if v_rule.org_id is null then return null; end if;

  if exists (select 1 from memberships where org_id = v_rule.org_id and user_id = auth.uid()) then
    return v_rule.org_id;
  end if;

  select seat_limit into v_limit from organizations where id = v_rule.org_id;
  if v_limit is not null and (select count(*) from memberships where org_id = v_rule.org_id) >= v_limit then
    return null;
  end if;

  insert into memberships (org_id, user_id, role) values (v_rule.org_id, auth.uid(), v_rule.default_role);
  update profiles set active_org_id = v_rule.org_id, updated_at = now()
  where id = auth.uid() and active_org_id is null;

  perform log_org_action(v_rule.org_id, 'member.join_domain', auth.uid(),
    jsonb_build_object('domain', v_domain, 'role', v_rule.default_role));

  return v_rule.org_id;
end;
$$;

-- Home-realm discovery for the sign-in page: does this address have to sign in
-- through its company's identity provider? Answers for a verified domain only,
-- and says nothing else about the company.
create or replace function sso_required_for(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select sso_required from org_domains
    where domain = lower(split_part(btrim(coalesce(p_email, '')), '@', 2))
      and verified_at is not null
  ), false);
$$;

revoke all on function org_member_directory(uuid)                                 from public, anon;
revoke all on function org_invite(uuid, text, org_role, uuid)                      from public, anon;
revoke all on function org_cancel_invitation(uuid)                                 from public, anon;
revoke all on function my_invitations()                                            from public, anon;
revoke all on function accept_invitation(uuid)                                     from public, anon;
revoke all on function accept_invitations_for_new_account()                        from public, anon;
revoke all on function org_set_member(uuid, uuid, org_role, uuid)                  from public, anon;
revoke all on function org_remove_member(uuid, uuid)                               from public, anon;
revoke all on function admin_set_org_domain(uuid, text, org_role, boolean, boolean, boolean) from public, anon;
revoke all on function admin_remove_org_domain(text)                               from public, anon;
revoke all on function join_by_email_domain()                                      from public, anon;
revoke all on function sso_required_for(text)                                      from public;

grant execute on function org_member_directory(uuid)                                to authenticated;
grant execute on function org_invite(uuid, text, org_role, uuid)                     to authenticated;
grant execute on function org_cancel_invitation(uuid)                                to authenticated;
grant execute on function my_invitations()                                           to authenticated;
grant execute on function accept_invitation(uuid)                                    to authenticated;
grant execute on function accept_invitations_for_new_account()                       to authenticated;
grant execute on function org_set_member(uuid, uuid, org_role, uuid)                 to authenticated;
grant execute on function org_remove_member(uuid, uuid)                              to authenticated;
grant execute on function admin_set_org_domain(uuid, text, org_role, boolean, boolean, boolean) to authenticated;
grant execute on function admin_remove_org_domain(text)                              to authenticated;
grant execute on function join_by_email_domain()                                     to authenticated;
grant execute on function sso_required_for(text)                                     to anon, authenticated;
