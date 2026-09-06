-- ============================================================================
-- TRUSS 0014 — Close the metering functions
-- ============================================================================
-- record_usage() was SECURITY DEFINER, took the organization and the quantity
-- from its caller, checked no authority, and was never revoked from PUBLIC.
-- Postgres grants EXECUTE to PUBLIC by default and PostgREST exposes every
-- public function as an RPC endpoint, so it was reachable with nothing but the
-- publishable anon key — the one that ships inside the browser bundle.
--
-- Verified against the live database rather than reasoned about: calling it
-- unauthenticated with a made-up organization id reached the foreign key check
-- and failed there, which means the body had already run. With a real id it
-- would have written.
--
-- Two ways to abuse it, both of which defeat the product's economics:
--
--   A negative quantity drives usage_counters below zero. within_quota() then
--   returns true for the rest of the month no matter how much is consumed —
--   unlimited AI, permanently, for whichever org you name.
--
--   A very large positive quantity burns any other tenant's monthly allowance.
--   Cross-tenant denial of service against a customer you can identify.
--
-- The fix is three things: a caller has to be signed in, the organization they
-- are metering has to be one they belong to, and the quantity has to be a
-- sane non-negative number. Then the function is taken away from anon entirely.
--
-- Requiring a signed-in caller is safe because every call site uses the
-- request-scoped client. Nothing meters through the service-role key.

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

  -- The organization being metered has to be the caller's own. Without this,
  -- naming somebody else's org spends their month for them.
  if not is_org_member(target_org) then
    raise exception 'Cannot record usage for another organization.' using errcode = '42501';
  end if;

  -- Negative is the dangerous direction: it un-spends a counter and makes
  -- within_quota() permanently true. The upper bound is a sanity rail — the
  -- largest legitimate single event is a practice session measured in seconds.
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
    updated_at = now()
  where org_id = target_org and period_month = month_start;
end;
$$;

-- within_quota() leaked in the other direction: readable by anyone with the
-- anon key, for any organization id, it reports whether that tenant has run out.
-- Harmless on its own and useful for probing which customers are active.
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

-- Headcount and plan for an arbitrary tenant, readable by anyone signed in.
-- Neither is called from application code; both exist for the invite flow and
-- for the admin console, which reaches them through functions of its own.
create or replace function seats_in_use(target_org uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when is_org_member(target_org)
    then (select count(*)::integer from memberships where org_id = target_org)
    else null
  end;
$$;

create or replace function seats_available(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not is_org_member(target_org) then false
    when (select seat_limit from organizations where id = target_org) is null then true
    else seats_in_use(target_org) < (select seat_limit from organizations where id = target_org)
  end;
$$;

-- ─── Take these away from the anonymous role ────────────────────────────────
-- PostgREST publishes every function in the public schema. Anything that is not
-- explicitly revoked is callable with the publishable key, signed in or not.

revoke all on function record_usage(uuid, uuid, text, integer, text) from public, anon;
revoke all on function within_quota(uuid, text)                      from public, anon;
revoke all on function effective_plan(uuid)                          from public, anon;
revoke all on function seats_in_use(uuid)                            from public, anon;
revoke all on function seats_available(uuid)                         from public, anon;

grant execute on function record_usage(uuid, uuid, text, integer, text) to authenticated;
grant execute on function within_quota(uuid, text)                      to authenticated;
grant execute on function effective_plan(uuid)                          to authenticated;
grant execute on function seats_in_use(uuid)                            to authenticated;
grant execute on function seats_available(uuid)                         to authenticated;

-- A counter that has already been driven negative would stay permanently under
-- its limit. Nothing in the schema stops that, so floor them and add the
-- constraint that should have been there.
update usage_counters set
  coach_messages       = greatest(coach_messages, 0),
  practice_seconds     = greatest(practice_seconds, 0),
  research_briefs      = greatest(research_briefs, 0),
  campaign_generations = greatest(campaign_generations, 0)
where coach_messages < 0 or practice_seconds < 0
   or research_briefs < 0 or campaign_generations < 0;

alter table usage_counters
  add constraint usage_counters_non_negative check (
    coach_messages >= 0 and practice_seconds >= 0
    and research_briefs >= 0 and campaign_generations >= 0
  );

alter table usage_events
  add constraint usage_events_quantity_sane check (quantity >= 0 and quantity <= 86400);
