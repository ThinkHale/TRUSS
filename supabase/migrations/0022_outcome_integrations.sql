-- ============================================================================
-- TRUSS 0022 — Letting a company's CRM tell TRUSS which deals closed
-- ============================================================================
-- 0017 gave accounts a contract value and won/lost dates. Reps will not keep
-- two systems in sync, so those fields are only trustworthy if the system of
-- record fills them. Contractors run JobNimbus, AccuLynx, ServiceTitan, Leap,
-- HubSpot, Salesforce — and nearly all of them can send a webhook, directly or
-- through Zapier or Make. So TRUSS takes one normalized webhook rather than
-- seven brittle connectors, and the CSV import on the Outcomes page covers
-- everything that can only export a spreadsheet.
--
-- A company's owners and admins create an endpoint and receive its token once.
-- Only a SHA-256 of the token is stored, so a database read cannot be replayed
-- as a credential. Tokens are revocable and show the prefix they started with
-- so an admin can tell which one a CRM is using.
--
-- Every inbound record is logged in outcome_events with what TRUSS did with it,
-- so "why didn't that job show up" has an answer a manager can read.

create table integration_endpoints (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  name         text not null constraint integration_endpoints_name_len check (length(btrim(name)) between 1 and 80),
  provider     text not null check (provider in
                 ('zapier', 'make', 'jobnimbus', 'acculynx', 'servicetitan', 'leap',
                  'hubspot', 'salesforce', 'other')),
  token_hash   text not null unique,
  token_prefix text not null,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index integration_endpoints_org_idx on integration_endpoints (org_id, created_at desc);

create table outcome_events (
  id              bigint generated always as identity primary key,
  org_id          uuid not null references organizations (id) on delete cascade,
  endpoint_id     uuid references integration_endpoints (id) on delete set null,
  -- 'webhook' or 'csv'.
  channel         text not null check (channel in ('webhook', 'csv')),
  external_source text,
  external_id     text,
  account_id      uuid references accounts (id) on delete set null,
  result          text not null check (result in ('created', 'updated', 'unchanged', 'rejected')),
  message         text,
  received_at     timestamptz not null default now()
);

create index outcome_events_org_idx on outcome_events (org_id, received_at desc);

alter table integration_endpoints enable row level security;
alter table outcome_events        enable row level security;

-- Managers can see what is connected and what arrived; only owners and admins
-- create and revoke. The token hash is not secret in the way the token is, but
-- nobody needs it, so it is not selectable from the client.
create policy integration_endpoints_read on integration_endpoints
  for select using (org_role_of(org_id) in ('owner', 'admin', 'manager'));

revoke select on integration_endpoints from authenticated, anon;
grant select (id, org_id, name, provider, token_prefix, created_by, created_at, last_used_at, revoked_at)
  on integration_endpoints to authenticated;
revoke insert, update, delete on integration_endpoints from authenticated, anon;

create policy outcome_events_read on outcome_events
  for select using (org_role_of(org_id) in ('owner', 'admin', 'manager'));

-- CSV imports run as the manager doing them, so they can log what happened;
-- webhook deliveries are logged by the route with the service role.
create policy outcome_events_csv_insert on outcome_events
  for insert with check (
    channel = 'csv'
    and endpoint_id is null
    and org_role_of(org_id) in ('owner', 'admin', 'manager')
  );

revoke update, delete on outcome_events from authenticated, anon;

-- ─── Endpoints ──────────────────────────────────────────────────────────────

-- Returns the token exactly once. It is not recoverable afterwards.
create or replace function org_create_integration(p_org uuid, p_name text, p_provider text)
returns table (endpoint_id uuid, token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_id    uuid;
begin
  if not is_org_admin(p_org) then
    raise exception 'Only owners and admins can connect a system.' using errcode = '42501';
  end if;
  if (select count(*) from integration_endpoints where org_id = p_org and revoked_at is null) >= 20 then
    raise exception 'Revoke an unused connection before adding another.' using errcode = '23514';
  end if;

  v_token := 'trs_' || encode(extensions.gen_random_bytes(24), 'hex');

  insert into integration_endpoints (org_id, name, provider, token_hash, token_prefix, created_by)
  values (p_org, btrim(p_name), p_provider,
          encode(extensions.digest(v_token, 'sha256'), 'hex'),
          left(v_token, 10), auth.uid())
  returning id into v_id;

  perform log_org_action(p_org, 'integration.create', null,
    jsonb_build_object('endpoint_id', v_id, 'name', btrim(p_name), 'provider', p_provider));

  return query select v_id, v_token;
end;
$$;

create or replace function org_revoke_integration(p_endpoint uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from integration_endpoints where id = p_endpoint;
  if v_org is null then return; end if;
  if not is_org_admin(v_org) then
    raise exception 'Only owners and admins can disconnect a system.' using errcode = '42501';
  end if;

  update integration_endpoints set revoked_at = now()
  where id = p_endpoint and revoked_at is null;

  perform log_org_action(v_org, 'integration.revoke', null, jsonb_build_object('endpoint_id', p_endpoint));
end;
$$;

-- ─── For the webhook route (service role only) ──────────────────────────────
-- The webhook arrives with a token and no user session. These run only under
-- the service role, which the route holds; no client role can call them.

create or replace function integration_for_token(p_token text)
returns table (endpoint_id uuid, org_id uuid, provider text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
begin
  return query
  update integration_endpoints e
  set last_used_at = now()
  where e.token_hash = v_hash and e.revoked_at is null
  returning e.id, e.org_id, e.provider;
end;
$$;

-- Resolves a rep's email to their user id inside one company only.
create or replace function org_member_by_email(p_org uuid, p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id
  from memberships m
  join auth.users u on u.id = m.user_id
  where m.org_id = p_org and lower(u.email) = lower(btrim(coalesce(p_email, '')))
  limit 1;
$$;

revoke all on function org_create_integration(uuid, text, text) from public, anon;
revoke all on function org_revoke_integration(uuid)             from public, anon;
revoke all on function integration_for_token(text)              from public, anon, authenticated;
revoke all on function org_member_by_email(uuid, text)          from public, anon, authenticated;

grant execute on function org_create_integration(uuid, text, text) to authenticated;
grant execute on function org_revoke_integration(uuid)             to authenticated;
grant execute on function integration_for_token(text)              to service_role;
grant execute on function org_member_by_email(uuid, text)          to service_role;
