-- ============================================================================
-- TRUSS 0015 — Put a ceiling on campaign generation
-- ============================================================================
-- usage_counters has carried campaign_generations since 0006 and the route has
-- been recording into it the whole time, but nothing ever read it back:
-- plan_entitlements had no column for campaigns and within_quota() fell through
-- to `else true`. So campaigns were metered and unlimited at the same time —
-- the counter went up and nothing ever looked at it.
--
-- The number is a free-tier guard rather than a paid allowance. Fifteen is
-- enough for a rep to see whether the copy is worth anything, and low enough
-- that an anonymous signup cannot mine the model for free marketing. Paying
-- plans are set high enough that nobody legitimate will meet the ceiling.

alter table plan_entitlements add column monthly_campaigns integer;

comment on column plan_entitlements.monthly_campaigns is
  'Campaign generations per calendar month. Null means unlimited, matching every other limit here.';

update plan_entitlements set monthly_campaigns = 15   where plan = 'free';
update plan_entitlements set monthly_campaigns = 150  where plan = 'pro';
update plan_entitlements set monthly_campaigns = 600  where plan = 'team';
update plan_entitlements set monthly_campaigns = null where plan in ('enterprise', 'operations');

-- Rewritten from 0014 — which added the authentication and membership guards —
-- with the campaign case filled in. Everything else is unchanged.
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
    when 'campaign_generation' then
      ent.monthly_campaigns is null or usage.campaign_generations < ent.monthly_campaigns
    -- Knowledge ingestion stays deliberately open: what a company teaches its
    -- own Coach should not be rationed, and it is a one-time cost per document
    -- rather than a per-use one.
    else true
  end;
end;
$$;

revoke all on function within_quota(uuid, text) from public, anon;
grant execute on function within_quota(uuid, text) to authenticated;
