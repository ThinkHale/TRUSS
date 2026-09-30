-- ============================================================================
-- TRUSS 0024 — What each customer costs to serve, and what they pay
-- ============================================================================
-- usage_events counts things — messages, practice seconds, briefs. It does not
-- say what they cost, and a Coach answer grounded in the knowledge base is not
-- a fixed-price object: its prompt carries doctrine, retrieved units, and the
-- company's own material, and its size moves with every knowledge release. The
-- only honest cost figure is the one the model provider reports per call, so
-- that is what is recorded here.
--
-- Revenue is the other half. Stripe knows what self-serve plans pay. An
-- Enterprise or portfolio contract is signed offline, so an operator records
-- its annual value, and the economics view reads both.
--
-- Nothing here is visible to tenants except their own token usage, to their
-- own admins. Margin is TRUSS's business, not the customer's.

create table ai_token_usage (
  id                  bigint generated always as identity primary key,
  org_id              uuid not null references organizations (id) on delete cascade,
  user_id             uuid references auth.users (id) on delete set null,
  feature             text not null check (feature in
                        ('coach', 'scoring', 'research', 'campaign', 'account_brief',
                         'practice_reply', 'field_review', 'knowledge_ingest', 'transcription', 'speech')),
  model               text not null constraint ai_token_usage_model_len check (length(model) <= 80),
  input_tokens        integer not null default 0,
  cached_input_tokens integer not null default 0,
  output_tokens       integer not null default 0,
  -- For audio models billed by duration rather than tokens.
  audio_seconds       integer not null default 0,
  created_at          timestamptz not null default now(),
  constraint ai_token_usage_sane check (
    input_tokens between 0 and 2000000 and cached_input_tokens between 0 and 2000000
    and output_tokens between 0 and 2000000 and audio_seconds between 0 and 86400
  )
);

create index ai_token_usage_org_idx on ai_token_usage (org_id, created_at desc);
create index ai_token_usage_created_idx on ai_token_usage (created_at);

alter table ai_token_usage enable row level security;

create policy ai_token_usage_read on ai_token_usage
  for select using (is_org_admin(org_id));

revoke insert, update, delete on ai_token_usage from authenticated, anon;

-- Same guards as record_usage (0014): signed in, own organization, sane
-- numbers. A route records what the provider reported for the call it just made.
create or replace function record_tokens(
  target_org      uuid,
  p_feature       text,
  p_model         text,
  p_input         integer default 0,
  p_output        integer default 0,
  p_cached        integer default 0,
  p_audio_seconds integer default 0
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
  if not is_org_member(target_org) then
    raise exception 'Cannot record usage for another organization.' using errcode = '42501';
  end if;
  if least(coalesce(p_input, 0), coalesce(p_output, 0), coalesce(p_cached, 0), coalesce(p_audio_seconds, 0)) < 0 then
    raise exception 'Token counts cannot be negative.' using errcode = '22023';
  end if;

  insert into ai_token_usage
    (org_id, user_id, feature, model, input_tokens, cached_input_tokens, output_tokens, audio_seconds)
  values
    (target_org, auth.uid(), p_feature, left(coalesce(p_model, 'unknown'), 80),
     coalesce(p_input, 0), coalesce(p_cached, 0), coalesce(p_output, 0), coalesce(p_audio_seconds, 0));
end;
$$;

revoke all on function record_tokens(uuid, text, text, integer, integer, integer, integer) from public, anon;
grant execute on function record_tokens(uuid, text, text, integer, integer, integer, integer) to authenticated;

-- ─── Contract value for deals signed outside Stripe ─────────────────────────

alter table organizations
  add column contract_annual_value_cents bigint
    constraint organizations_contract_value_sane check (contract_annual_value_cents is null or contract_annual_value_cents >= 0),
  add column contract_starts_on  date,
  add column contract_renews_on  date;

comment on column organizations.contract_annual_value_cents is
  'Annual contract value for an offline (Enterprise or portfolio) agreement. Stripe-billed plans leave this null; their revenue comes from the plan price.';

create or replace function admin_set_contract(
  p_org         uuid,
  p_annual_cents bigint,
  p_starts_on   date default null,
  p_renews_on   date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before bigint;
begin
  perform require_platform_admin();

  select contract_annual_value_cents into v_before from organizations where id = p_org;
  if not found then
    raise exception 'No such organization.' using errcode = '23503';
  end if;

  update organizations
  set contract_annual_value_cents = p_annual_cents,
      contract_starts_on = p_starts_on,
      contract_renews_on = p_renews_on,
      updated_at = now()
  where id = p_org;

  perform log_admin_action('org.set_contract', p_org, null,
    jsonb_build_object('from_cents', v_before, 'to_cents', p_annual_cents,
                       'starts_on', p_starts_on, 'renews_on', p_renews_on));
end;
$$;

revoke all on function admin_set_contract(uuid, bigint, date, date) from public, anon;
grant execute on function admin_set_contract(uuid, bigint, date, date) to authenticated;

-- ─── The operator's economics view ──────────────────────────────────────────
-- One row per organization per model for a month, plus what the application
-- needs to turn it into revenue and margin. Prices live in the application
-- (src/lib/billing/economics.ts) because they change with the provider's price
-- list, not with the schema.

create or replace function admin_unit_economics(p_month date)
returns table (
  org_id                      uuid,
  name                        text,
  kind                        org_kind,
  parent_org_id               uuid,
  billed_plan                 org_plan,
  effective                   org_plan,
  subscription_status         text,
  seat_limit                  integer,
  members                     integer,
  active_users                integer,
  contract_annual_value_cents bigint,
  practice_seconds            integer,
  coach_messages              integer,
  model                       text,
  input_tokens                bigint,
  cached_input_tokens         bigint,
  output_tokens               bigint,
  audio_seconds               bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz := date_trunc('month', p_month::timestamptz);
  v_end   timestamptz := date_trunc('month', p_month::timestamptz) + interval '1 month';
begin
  perform require_platform_admin();

  return query
  select o.id,
         o.name,
         o.kind,
         o.parent_org_id,
         o.plan,
         effective_plan(o.id),
         o.subscription_status,
         o.seat_limit,
         (select count(*)::integer from memberships m where m.org_id = o.id),
         (select count(distinct e.user_id)::integer from usage_events e
            where e.org_id = o.id and e.created_at >= v_start and e.created_at < v_end),
         o.contract_annual_value_cents,
         coalesce((select uc.practice_seconds from usage_counters uc
                    where uc.org_id = o.id and uc.period_month = v_start::date), 0),
         coalesce((select uc.coach_messages from usage_counters uc
                    where uc.org_id = o.id and uc.period_month = v_start::date), 0),
         t.model,
         coalesce(t.input_tokens, 0)::bigint,
         coalesce(t.cached_input_tokens, 0)::bigint,
         coalesce(t.output_tokens, 0)::bigint,
         coalesce(t.audio_seconds, 0)::bigint
  from organizations o
  left join lateral (
    select u.model,
           sum(u.input_tokens) as input_tokens,
           sum(u.cached_input_tokens) as cached_input_tokens,
           sum(u.output_tokens) as output_tokens,
           sum(u.audio_seconds) as audio_seconds
    from ai_token_usage u
    where u.org_id = o.id and u.created_at >= v_start and u.created_at < v_end
    group by u.model
  ) t on true
  order by o.name, t.model;
end;
$$;

revoke all on function admin_unit_economics(date) from public, anon;
grant execute on function admin_unit_economics(date) to authenticated;
