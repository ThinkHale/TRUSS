-- ============================================================================
-- TRUSS 0006 — Plan entitlements and usage metering
-- ============================================================================
-- AI is the main variable cost, so usage is metered per org. Entitlements are
-- data rather than hardcoded checks, which lets an Enterprise deal be closed
-- with custom limits without a deploy.

create table plan_entitlements (
  plan                    org_plan primary key,
  -- Null means unlimited.
  monthly_coach_messages  integer,
  monthly_practice_minutes integer,
  monthly_research_briefs integer,
  knowledge_documents     integer,
  custom_scenarios        boolean not null default false,
  team_dashboard          boolean not null default false,
  white_label             boolean not null default false,
  seats_included          integer not null default 1
);

insert into plan_entitlements
  (plan, monthly_coach_messages, monthly_practice_minutes, monthly_research_briefs,
   knowledge_documents, custom_scenarios, team_dashboard, white_label, seats_included)
values
  ('free',        30,   20,   3,    0,    false, false, false, 1),
  ('pro',         750,  300,  60,   0,    false, false, false, 1),
  ('team',        3000, 1500, 250,  25,   true,  true,  false, 10),
  ('enterprise',  null, null, null, null, true,  true,  true,  25);

-- Rolled up per org per calendar month.
create table usage_counters (
  org_id           uuid not null references organizations (id) on delete cascade,
  period_month     date not null,
  coach_messages   integer not null default 0,
  practice_seconds integer not null default 0,
  research_briefs  integer not null default 0,
  campaign_generations integer not null default 0,
  updated_at       timestamptz not null default now(),
  primary key (org_id, period_month)
);

-- Per-event log. Kept for cost attribution and for showing a manager which
-- reps are actually practicing.
create table usage_events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  kind        text not null check (kind in
                ('coach_message', 'practice_seconds', 'research_brief',
                 'campaign_generation', 'scorecard', 'knowledge_ingest')),
  quantity    integer not null default 1,
  model       text,
  created_at  timestamptz not null default now()
);

create index usage_events_org_idx on usage_events (org_id, created_at desc);

-- Atomically records an event and rolls it into the monthly counter.
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
    updated_at = now()
  where org_id = target_org and period_month = month_start;
end;
$$;

-- Returns true when the org is still under its limit for this kind.
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
  select plan into org_plan_value from organizations where id = target_org;
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

alter table plan_entitlements enable row level security;
alter table usage_counters    enable row level security;
alter table usage_events      enable row level security;

create policy entitlements_read on plan_entitlements for select using (auth.uid() is not null);

create policy usage_counters_read on usage_counters
  for select using (is_org_member(org_id));

create policy usage_events_read on usage_events
  for select using (is_org_admin(org_id));
