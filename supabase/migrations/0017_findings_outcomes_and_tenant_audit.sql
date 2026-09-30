-- ============================================================================
-- TRUSS 0017 — Findings a leader can count, outcomes training can be judged by,
--              and a record of who changed what inside a tenant
-- ============================================================================
-- Three things the product claimed but could not show.
--
-- 1. Critical findings. The scorer has always named deductible waiving, promised
--    claim outcomes, and payment-only framing — but only in the summary prose.
--    Nothing could count them, so no leader could ask "how often does this
--    happen on my team" without reading every scorecard. They become data here.
--
-- 2. Deal outcomes. accounts knew a status (lead → signed → lost) and nothing
--    else: no contract value, no date it was won, no date it was lost. Without
--    those, "reps who practice close more" is a sentence nobody can check. The
--    trigger stamps the dates from status changes so a rep who only ever moves
--    the status still produces usable data; an import can set them explicitly.
--
-- 3. A tenant audit log. admin_audit_log records what TRUSS operators do and is
--    readable only by operators. A customer's own admins had no record of who
--    added a rep, who loaded a document, or who exported their data — the first
--    thing an Enterprise security review asks for.

-- ─── 1. Structured critical findings on scorecards ─────────────────────────

alter table scorecards
  add column critical_findings jsonb not null default '[]'::jsonb
    constraint scorecards_findings_is_array check (jsonb_typeof(critical_findings) = 'array'),
  add column has_critical boolean
    generated always as (jsonb_array_length(critical_findings) > 0) stored,
  -- The knowledge base's weighted rubric (docs/05_metrics/scorecards_and_benchmarks.md):
  -- Trust 20, Relate 15, Understand 25, Solve 25, Secure 15, each beam scored 0–4,
  -- so the result runs 0–100. Stored rather than recomputed so every report, the
  -- certification check, and the app read the same number.
  add column weighted_score smallint
    generated always as (
      round((20 * trust + 15 * relate + 25 * understand + 25 * solve + 15 * secure)::numeric / 4)::smallint
    ) stored;

comment on column scorecards.critical_findings is
  'Array of {code, description, evidence}. Any entry is a critical failure under the knowledge base''s critical override: the session cannot count as passing.';
comment on column scorecards.weighted_score is
  'Context-weighted TRUSS rubric, 0–100. Passing is 75 or more with no critical finding (see truss_is_passing).';

create index scorecards_critical_idx on scorecards (org_id, created_at desc) where has_critical;

-- One definition of "passing", so the team dashboard, ramp time, and
-- certification cannot disagree. Mirrors isPassing() in src/lib/truss/rubric.ts.
create or replace function truss_is_passing(p_weighted integer, p_has_critical boolean)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_weighted, 0) >= 75 and not coalesce(p_has_critical, false);
$$;

-- ─── 2. Deal outcomes on accounts ───────────────────────────────────────────

alter table accounts
  add column contract_value_cents bigint
    constraint accounts_contract_value_sane check (contract_value_cents is null or contract_value_cents between 0 and 100000000000),
  add column signed_at   timestamptz,
  add column lost_at     timestamptz,
  add column lost_reason text constraint accounts_lost_reason_len check (lost_reason is null or length(lost_reason) <= 500),
  add column lead_source text constraint accounts_lead_source_len check (lead_source is null or length(lead_source) <= 120),
  -- Where the record came from when it was imported, and its id there. Lets a
  -- CRM send the same job twice without creating two accounts.
  add column external_source text
    constraint accounts_external_source_format check (external_source is null or external_source ~ '^[a-z0-9_-]{1,40}$'),
  add column external_id text
    constraint accounts_external_id_len check (external_id is null or length(external_id) between 1 and 200);

create unique index accounts_external_uidx
  on accounts (org_id, external_source, external_id)
  where external_id is not null;

create index accounts_signed_idx on accounts (org_id, signed_at) where signed_at is not null;
create index accounts_lost_idx   on accounts (org_id, lost_at)   where lost_at is not null;

comment on column accounts.signed_at is
  'When the deal was won. Stamped when status first reaches signed / in-production / complete, unless an import supplied it.';
comment on column accounts.lost_at is
  'When the deal was lost. Stamped when status reaches lost, unless an import supplied it. Cleared if the deal reopens.';

-- Keeps the outcome dates consistent with status, whoever writes the row.
-- Explicit dates win (an import knows when a job was really signed); missing
-- ones are filled from the moment the status changed.
create or replace function accounts_stamp_outcome()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('signed', 'in-production', 'complete') then
    new.signed_at := coalesce(new.signed_at, now());
    new.lost_at := null;
  elsif new.status = 'lost' then
    -- A signed job that cancels keeps its signed_at: it was won, then lost.
    new.lost_at := coalesce(new.lost_at, now());
  else
    -- Back to lead or inspected: the deal is open again and has no outcome.
    new.signed_at := null;
    new.lost_at := null;
  end if;
  return new;
end;
$$;

create trigger accounts_stamp_outcome
  before insert or update of status, signed_at, lost_at on accounts
  for each row execute function accounts_stamp_outcome();

-- Backfill existing rows so history is not all "unknown".
update accounts set signed_at = coalesce(signed_at, updated_at)
where status in ('signed', 'in-production', 'complete') and signed_at is null;
update accounts set lost_at = coalesce(lost_at, updated_at)
where status = 'lost' and lost_at is null;

-- ─── 3. Tenant audit log ────────────────────────────────────────────────────

create table org_audit_log (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references organizations (id) on delete cascade,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  target_user uuid references auth.users (id) on delete set null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index org_audit_log_org_idx on org_audit_log (org_id, created_at desc);

comment on table org_audit_log is
  'What a tenant''s own people did with authority inside it: roster changes, knowledge changes, exports, integrations, certifications. Operator actions stay in admin_audit_log; org_audit_feed() shows a tenant both.';

alter table org_audit_log enable row level security;

create policy org_audit_log_read on org_audit_log
  for select using (is_org_admin(org_id));

-- No write policy and no direct grants: rows are written by the functions
-- below, in the same transaction as the change they describe.
revoke insert, update, delete on org_audit_log from authenticated, anon;

-- Internal. Called only from SECURITY DEFINER functions that have already
-- checked authority, so it is not granted to any client role.
create or replace function log_org_action(
  p_org         uuid,
  p_action      text,
  p_target_user uuid default null,
  p_detail      jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into org_audit_log (org_id, actor_id, action, target_user, detail)
  values (p_org, auth.uid(), p_action, p_target_user, coalesce(p_detail, '{}'::jsonb));
end;
$$;

revoke all on function log_org_action(uuid, text, uuid, jsonb) from public, anon, authenticated;

-- For the handful of changes the application makes with the caller's own
-- client (loading a document, exporting data): the actor is always auth.uid(),
-- the org must be one the caller manages, and the action must be one of a
-- fixed set, so this cannot be used to forge another person's entry or to
-- write arbitrary text into someone else's log.
create or replace function record_org_event(
  p_org    uuid,
  p_action text,
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;
  if coalesce(org_role_of(p_org) in ('owner', 'admin', 'manager'), false) is not true then
    raise exception 'Only managers can record company events.' using errcode = '42501';
  end if;
  if p_action not in (
    'knowledge.add', 'knowledge.delete',
    'scenario.create', 'scenario.update', 'scenario.delete',
    'export.org', 'export.accounts',
    'outcomes.import'
  ) then
    raise exception 'Unknown event.' using errcode = '22023';
  end if;
  if pg_column_size(p_detail) > 4096 then
    raise exception 'Event detail is too large.' using errcode = '22023';
  end if;

  perform log_org_action(p_org, p_action, null, p_detail);
end;
$$;

revoke all on function record_org_event(uuid, text, jsonb) from public, anon;
grant execute on function record_org_event(uuid, text, jsonb) to authenticated;

-- Everything done inside a tenant, by its own people or by TRUSS operators, in
-- one stream. This is the answer to "who at TRUSS has touched our account".
create or replace function org_audit_feed(p_org uuid, p_limit integer default 100)
returns table (
  source      text,
  actor_id    uuid,
  actor_name  text,
  action      text,
  target_user uuid,
  target_name text,
  detail      jsonb,
  created_at  timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_org_admin(p_org) then
    raise exception 'Only owners and admins can read the audit log.' using errcode = '42501';
  end if;

  return query
  select * from (
    select 'company'::text, l.actor_id, pa.full_name, l.action, l.target_user, pt.full_name, l.detail, l.created_at
    from org_audit_log l
    left join profiles pa on pa.id = l.actor_id
    left join profiles pt on pt.id = l.target_user
    where l.org_id = p_org
    union all
    select 'truss'::text, a.actor_id, 'TRUSS operations', a.action, a.target_user, pt.full_name, a.detail, a.created_at
    from admin_audit_log a
    left join profiles pt on pt.id = a.target_user
    where a.target_org = p_org
  ) feed
  order by 8 desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

revoke all on function org_audit_feed(uuid, integer) from public, anon;
grant execute on function org_audit_feed(uuid, integer) to authenticated;
revoke all on function truss_is_passing(integer, boolean) from public, anon;
grant execute on function truss_is_passing(integer, boolean) to authenticated;
