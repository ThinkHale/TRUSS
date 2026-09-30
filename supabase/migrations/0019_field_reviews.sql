-- ============================================================================
-- TRUSS 0019 — Field reviews: scoring a real conversation, not a practice one
-- ============================================================================
-- Practice proves a rep can do it in a simulator. A field review is a real
-- conversation — a ride-along a manager recorded, a call a rep recorded on
-- their phone — transcribed and scored against the same rubric, with the same
-- critical findings. It is what moves TRUSS from "training" to evidence about
-- how people actually sell.
--
-- Three decisions shape the table.
--
-- Consent is recorded, not assumed. Recording law varies by state, and several
-- states require every party's consent. TRUSS does not try to encode that; it
-- holds every upload to the strictest standard — everyone on the recording
-- knew and agreed — and stores the attestation, who made it, and when.
--
-- Audio is never kept. The route transcribes it and deletes it in the same
-- request. What remains is the transcript, which is the evidence the scorecard
-- quotes, and which the rep can read.
--
-- Nobody writes these rows from the browser. The route establishes who is
-- allowed to submit for whom and writes with the service role, the same shape
-- 0016 gave scorecards.

create table field_reviews (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizations (id) on delete cascade,
  -- The rep whose conversation this is.
  user_id              uuid not null references auth.users (id) on delete cascade,
  -- Who uploaded it: the rep, or a manager on a ride-along.
  submitted_by         uuid references auth.users (id) on delete set null,
  account_id           uuid references accounts (id) on delete set null,
  context              text not null constraint field_reviews_context_len check (length(context) between 1 and 500),
  trade                text,
  language             text not null default 'en' check (language in ('en', 'es')),
  consent_attested_at  timestamptz not null,
  consent_statement    text not null,
  audio_seconds        integer constraint field_reviews_audio_sane check (audio_seconds is null or audio_seconds between 0 and 7200),
  -- [{ role: 'rep' | 'character', text }] — 'character' is the customer.
  transcript           jsonb not null default '[]'::jsonb,
  trust                smallint not null check (trust      between 0 and 4),
  relate               smallint not null check (relate     between 0 and 4),
  understand           smallint not null check (understand between 0 and 4),
  solve                smallint not null check (solve      between 0 and 4),
  secure               smallint not null check (secure     between 0 and 4),
  total_score          smallint generated always as (trust + relate + understand + solve + secure) stored,
  weighted_score       smallint generated always as (
                         round((20 * trust + 15 * relate + 25 * understand + 25 * solve + 15 * secure)::numeric / 4)::smallint
                       ) stored,
  outcome              text not null check (outcome in ('signed', 'next-step-set', 'no-commitment', 'lost')),
  headline             text not null,
  summary              text not null,
  stages               jsonb not null,
  critical_findings    jsonb not null default '[]'::jsonb
                         constraint field_reviews_findings_is_array check (jsonb_typeof(critical_findings) = 'array'),
  has_critical         boolean generated always as (jsonb_array_length(critical_findings) > 0) stored,
  created_at           timestamptz not null default now()
);

create index field_reviews_user_idx on field_reviews (user_id, created_at desc);
create index field_reviews_org_idx  on field_reviews (org_id, created_at desc);

alter table field_reviews enable row level security;

-- The rep reads their own; the company's managers read the team's, as they do
-- practice scorecards. Portfolio leaders get aggregates only (0023).
create policy field_reviews_own_read on field_reviews
  for select using (user_id = auth.uid() and is_org_member(org_id));

create policy field_reviews_manager_read on field_reviews
  for select using (org_role_of(org_id) in ('owner', 'admin', 'manager'));

revoke insert, update, delete on field_reviews from authenticated, anon;

-- ─── Metering ───────────────────────────────────────────────────────────────
-- A field review costs a transcription and a scoring call, so it is metered
-- and capped like everything else that spends model time.

-- 0006 declared the kind check inline, so its name was generated. Find it by
-- what it checks rather than trusting the generated name, so the old list
-- cannot survive alongside the new one and refuse every field-review event.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.usage_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.usage_events drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table usage_events add constraint usage_events_kind_check check (kind in (
  'coach_message', 'practice_seconds', 'research_brief',
  'campaign_generation', 'scorecard', 'knowledge_ingest',
  'field_review', 'transcription_seconds'
));

alter table usage_counters
  add column field_reviews integer not null default 0
    constraint usage_counters_field_reviews_non_negative check (field_reviews >= 0);

alter table plan_entitlements add column monthly_field_reviews integer;

comment on column plan_entitlements.monthly_field_reviews is
  'Real-conversation reviews per calendar month. Null means unlimited.';

update plan_entitlements set monthly_field_reviews = 1    where plan = 'free';
update plan_entitlements set monthly_field_reviews = 10   where plan = 'pro';
update plan_entitlements set monthly_field_reviews = 80   where plan = 'team';
update plan_entitlements set monthly_field_reviews = null where plan in ('enterprise', 'operations');

-- Rewritten from 0014 with the field-review counter added. The guards —
-- signed in, own organization, sane quantity — are unchanged.
create or replace function record_usage(
  target_org uuid,
  target_user uuid,
  event_kind text,
  qty integer default 1,
  model_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start date := date_trunc('month', now())::date;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  if not is_org_member(target_org) then
    raise exception 'Cannot record usage for another organization.' using errcode = '42501';
  end if;

  if qty is null or qty < 0 then
    raise exception 'Usage quantity cannot be negative.' using errcode = '22023';
  end if;
  if qty > 86400 then
    raise exception 'Usage quantity is implausible.' using errcode = '22023';
  end if;

  insert into usage_events (org_id, user_id, kind, quantity, model)
  values (target_org, target_user, event_kind, qty, model_name);

  insert into usage_counters (org_id, period_month)
  values (target_org, month_start)
  on conflict (org_id, period_month) do nothing;

  update usage_counters
  set
    coach_messages       = coach_messages       + case when event_kind = 'coach_message'       then qty else 0 end,
    practice_seconds     = practice_seconds     + case when event_kind = 'practice_seconds'    then qty else 0 end,
    research_briefs      = research_briefs      + case when event_kind = 'research_brief'      then qty else 0 end,
    campaign_generations = campaign_generations + case when event_kind = 'campaign_generation' then qty else 0 end,
    field_reviews        = field_reviews        + case when event_kind = 'field_review'        then qty else 0 end,
    updated_at = now()
  where org_id = target_org and period_month = month_start;
end;
$$;

-- Rewritten from 0015 with the field-review case added.
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
  if auth.uid() is null or not is_org_member(target_org) then
    return false;
  end if;

  org_plan_value := effective_plan(target_org);
  if org_plan_value is null then return false; end if;

  select * into ent from plan_entitlements where plan = org_plan_value;
  select * into usage from usage_counters
    where org_id = target_org and period_month = month_start;

  -- No usage yet this month means nothing has been consumed — except that a
  -- limit of zero still means none.
  if usage is null then
    return case event_kind
      when 'field_review' then ent.monthly_field_reviews is null or ent.monthly_field_reviews > 0
      else true
    end;
  end if;

  return case event_kind
    when 'coach_message' then
      ent.monthly_coach_messages is null or usage.coach_messages < ent.monthly_coach_messages
    when 'practice_seconds' then
      ent.monthly_practice_minutes is null
        or usage.practice_seconds < ent.monthly_practice_minutes * 60
    when 'research_brief' then
      ent.monthly_research_briefs is null or usage.research_briefs < ent.monthly_research_briefs
    when 'campaign_generation' then
      ent.monthly_campaigns is null or usage.campaign_generations < ent.monthly_campaigns
    when 'field_review' then
      ent.monthly_field_reviews is null or usage.field_reviews < ent.monthly_field_reviews
    else true
  end;
end;
$$;

revoke all on function record_usage(uuid, uuid, text, integer, text) from public, anon;
revoke all on function within_quota(uuid, text)                      from public, anon;
grant execute on function record_usage(uuid, uuid, text, integer, text) to authenticated;
grant execute on function within_quota(uuid, text)                      to authenticated;
