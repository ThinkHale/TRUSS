-- ============================================================================
-- TRUSS 0023 — What a manager and a portfolio leader actually look at
-- ============================================================================
-- The Team plan has promised "team scorecards and stage-by-stage progress"
-- since launch. Nothing computed them. These two functions are that promise,
-- and the portfolio view the holding-company buyer needs on top of it.
--
-- team_rep_summary runs as the caller (SECURITY INVOKER). A company's managers
-- already read their reps' sessions, scorecards, and field reviews through RLS,
-- so the function needs no authority of its own and cannot return a row the
-- caller could not have queried themselves. It refuses reps, because the
-- dashboard is a manager's tool, not because RLS would leak anything.
--
-- portfolio_company_summary runs as its owner (SECURITY DEFINER), because a
-- portfolio leader deliberately has no row access to a company's people
-- (0018). It returns one aggregated row per company — no names, no quotes, no
-- transcripts — and checks that the caller leads that portfolio first.
--
-- Two definitions appear in both and must not drift:
--   passing    truss_is_passing(weighted_score, has_critical) — 0017
--   ramp time  days from joining the company to the first passing simulation
--   won/lost   decided inside the period: signed_at or lost_at in range, with
--              the account's current status deciding which side it counts on

create or replace function team_rep_summary(
  p_org    uuid,
  p_since  timestamptz,
  p_branch uuid default null
)
returns table (
  user_id              uuid,
  full_name            text,
  role                 org_role,
  branch_id            uuid,
  branch_name          text,
  joined_at            timestamptz,
  simulations          integer,
  practice_seconds     integer,
  avg_trust            numeric,
  avg_relate           numeric,
  avg_understand       numeric,
  avg_solve            numeric,
  avg_secure           numeric,
  avg_weighted         numeric,
  latest_weighted      integer,
  last_practiced_at    timestamptz,
  critical_count       integer,
  first_passing_at     timestamptz,
  ramp_days            integer,
  field_reviews        integer,
  field_avg_weighted   numeric,
  deals_won            integer,
  deals_lost           integer,
  won_value_cents      bigint,
  certified            boolean
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if coalesce(org_role_of(p_org) in ('owner', 'admin', 'manager'), false) is not true then
    raise exception 'The team dashboard is for managers.' using errcode = '42501';
  end if;

  return query
  with people as (
    select m.user_id, m.role, m.branch_id, m.created_at as joined_at
    from memberships m
    where m.org_id = p_org and (p_branch is null or m.branch_id = p_branch)
  ),
  sims as (
    select s.user_id,
           count(*)::integer                  as simulations,
           round(avg(s.trust), 2)             as avg_trust,
           round(avg(s.relate), 2)            as avg_relate,
           round(avg(s.understand), 2)        as avg_understand,
           round(avg(s.solve), 2)             as avg_solve,
           round(avg(s.secure), 2)            as avg_secure,
           round(avg(s.weighted_score), 1)    as avg_weighted,
           max(s.created_at)                  as last_practiced_at,
           count(*) filter (where s.has_critical)::integer as critical_count
    from scorecards s
    where s.org_id = p_org and s.created_at >= p_since
    group by s.user_id
  ),
  latest as (
    select distinct on (s.user_id) s.user_id, s.weighted_score::integer as latest_weighted
    from scorecards s
    where s.org_id = p_org
    order by s.user_id, s.created_at desc
  ),
  first_pass as (
    select s.user_id, min(s.created_at) as first_passing_at
    from scorecards s
    where s.org_id = p_org and truss_is_passing(s.weighted_score, s.has_critical)
    group by s.user_id
  ),
  minutes as (
    select ps.user_id, coalesce(sum(ps.duration_seconds), 0)::integer as practice_seconds
    from practice_sessions ps
    where ps.org_id = p_org and ps.started_at >= p_since
    group by ps.user_id
  ),
  field as (
    select f.user_id, count(*)::integer as field_reviews, round(avg(f.weighted_score), 1) as field_avg_weighted
    from field_reviews f
    where f.org_id = p_org and f.created_at >= p_since
    group by f.user_id
  ),
  deals as (
    select a.owner_user_id as user_id,
           count(*) filter (where a.status in ('signed', 'in-production', 'complete') and a.signed_at >= p_since)::integer as deals_won,
           count(*) filter (where a.status = 'lost' and a.lost_at >= p_since)::integer as deals_lost,
           coalesce(sum(a.contract_value_cents) filter (
             where a.status in ('signed', 'in-production', 'complete') and a.signed_at >= p_since), 0)::bigint as won_value_cents
    from accounts a
    where a.org_id = p_org and a.owner_user_id is not null
    group by a.owner_user_id
  ),
  certs as (
    select c.user_id, true as certified
    from certifications c
    where c.org_id = p_org and c.revoked_at is null
    group by c.user_id
  )
  select p.user_id,
         pr.full_name,
         p.role,
         p.branch_id,
         b.name,
         p.joined_at,
         coalesce(sims.simulations, 0),
         coalesce(minutes.practice_seconds, 0),
         sims.avg_trust, sims.avg_relate, sims.avg_understand, sims.avg_solve, sims.avg_secure,
         sims.avg_weighted,
         latest.latest_weighted,
         sims.last_practiced_at,
         coalesce(sims.critical_count, 0),
         first_pass.first_passing_at,
         case when first_pass.first_passing_at is not null
              then greatest(0, extract(day from first_pass.first_passing_at - p.joined_at))::integer end,
         coalesce(field.field_reviews, 0),
         field.field_avg_weighted,
         coalesce(deals.deals_won, 0),
         coalesce(deals.deals_lost, 0),
         coalesce(deals.won_value_cents, 0),
         coalesce(certs.certified, false)
  from people p
  left join profiles pr   on pr.id = p.user_id
  left join branches b    on b.id = p.branch_id
  left join sims          on sims.user_id = p.user_id
  left join latest        on latest.user_id = p.user_id
  left join first_pass    on first_pass.user_id = p.user_id
  left join minutes       on minutes.user_id = p.user_id
  left join field         on field.user_id = p.user_id
  left join deals         on deals.user_id = p.user_id
  left join certs         on certs.user_id = p.user_id
  order by coalesce(pr.full_name, p.user_id::text);
end;
$$;

-- One row per operating company in a portfolio.
--
-- The practiced / unpracticed split is the number a sponsor asks for first:
-- win rate for reps who practiced at least p_practice_minutes in the period,
-- against reps who did not. It is a comparison, not proof of cause — the
-- portfolio page says so next to it, with the sample sizes.
create or replace function portfolio_company_summary(
  p_portfolio        uuid,
  p_since            timestamptz,
  p_practice_minutes integer default 60
)
returns table (
  org_id                    uuid,
  name                      text,
  plan                      org_plan,
  reps                      integer,
  active_reps               integer,
  practice_seconds          bigint,
  simulations               integer,
  avg_trust                 numeric,
  avg_relate                numeric,
  avg_understand            numeric,
  avg_solve                 numeric,
  avg_secure                numeric,
  avg_weighted              numeric,
  critical_count            integer,
  critical_rate             numeric,
  median_ramp_days          numeric,
  reps_passing              integer,
  certified_reps            integer,
  field_reviews             integer,
  deals_won                 integer,
  deals_lost                integer,
  won_value_cents           bigint,
  practiced_reps            integer,
  practiced_won             integer,
  practiced_decided         integer,
  unpracticed_reps          integer,
  unpracticed_won           integer,
  unpracticed_decided       integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(org_role_of(p_portfolio) in ('owner', 'admin', 'manager'), false) is not true then
    raise exception 'The portfolio view is for the portfolio''s leaders.' using errcode = '42501';
  end if;
  if not exists (select 1 from organizations where id = p_portfolio and kind = 'portfolio') then
    raise exception 'That organization is not a portfolio.' using errcode = '22023';
  end if;

  return query
  with companies as (
    select o.id, o.name, effective_plan(o.id) as plan
    from organizations o
    where o.parent_org_id = p_portfolio
  ),
  reps as (
    select m.org_id, m.user_id, m.created_at as joined_at
    from memberships m
    join companies c on c.id = m.org_id
    where m.role = 'rep'
  ),
  practice as (
    select ps.org_id, ps.user_id, coalesce(sum(ps.duration_seconds), 0) as seconds
    from practice_sessions ps
    join companies c on c.id = ps.org_id
    where ps.started_at >= p_since
    group by ps.org_id, ps.user_id
  ),
  sims as (
    select s.org_id,
           count(*)::integer as simulations,
           round(avg(s.trust), 2) as avg_trust,
           round(avg(s.relate), 2) as avg_relate,
           round(avg(s.understand), 2) as avg_understand,
           round(avg(s.solve), 2) as avg_solve,
           round(avg(s.secure), 2) as avg_secure,
           round(avg(s.weighted_score), 1) as avg_weighted,
           count(*) filter (where s.has_critical)::integer as critical_count,
           count(distinct s.user_id)::integer as active_reps
    from scorecards s
    join companies c on c.id = s.org_id
    where s.created_at >= p_since
    group by s.org_id
  ),
  first_pass as (
    select r.org_id, r.user_id,
           greatest(0, extract(day from min(s.created_at) - r.joined_at)) as ramp_days
    from reps r
    join scorecards s on s.org_id = r.org_id and s.user_id = r.user_id
    where truss_is_passing(s.weighted_score, s.has_critical)
    group by r.org_id, r.user_id, r.joined_at
  ),
  outcomes as (
    select a.org_id, a.owner_user_id as user_id,
           count(*) filter (where a.status in ('signed', 'in-production', 'complete') and a.signed_at >= p_since) as won,
           count(*) filter (where a.status = 'lost' and a.lost_at >= p_since) as lost,
           coalesce(sum(a.contract_value_cents) filter (
             where a.status in ('signed', 'in-production', 'complete') and a.signed_at >= p_since), 0) as won_value
    from accounts a
    join companies c on c.id = a.org_id
    where a.owner_user_id is not null
    group by a.org_id, a.owner_user_id
  ),
  rep_rows as (
    select r.org_id, r.user_id,
           coalesce(pr.seconds, 0) >= p_practice_minutes * 60 as practiced,
           coalesce(o.won, 0) as won,
           coalesce(o.won, 0) + coalesce(o.lost, 0) as decided
    from reps r
    left join practice pr on pr.org_id = r.org_id and pr.user_id = r.user_id
    left join outcomes o  on o.org_id = r.org_id and o.user_id = r.user_id
  )
  select c.id,
         c.name,
         c.plan,
         (select count(*)::integer from reps r where r.org_id = c.id),
         coalesce(sims.active_reps, 0),
         (select coalesce(sum(p.seconds), 0)::bigint from practice p where p.org_id = c.id),
         coalesce(sims.simulations, 0),
         sims.avg_trust, sims.avg_relate, sims.avg_understand, sims.avg_solve, sims.avg_secure,
         sims.avg_weighted,
         coalesce(sims.critical_count, 0),
         case when coalesce(sims.simulations, 0) > 0
              then round(sims.critical_count::numeric / sims.simulations, 3) end,
         (select percentile_cont(0.5) within group (order by fp.ramp_days)::numeric
            from first_pass fp where fp.org_id = c.id),
         (select count(*)::integer from first_pass fp where fp.org_id = c.id),
         (select count(distinct ce.user_id)::integer from certifications ce
            where ce.org_id = c.id and ce.revoked_at is null),
         (select count(*)::integer from field_reviews f where f.org_id = c.id and f.created_at >= p_since),
         (select coalesce(sum(o.won), 0)::integer from outcomes o where o.org_id = c.id),
         (select coalesce(sum(o.lost), 0)::integer from outcomes o where o.org_id = c.id),
         (select coalesce(sum(o.won_value), 0)::bigint from outcomes o where o.org_id = c.id),
         (select count(*)::integer from rep_rows rr where rr.org_id = c.id and rr.practiced),
         (select coalesce(sum(rr.won), 0)::integer from rep_rows rr where rr.org_id = c.id and rr.practiced),
         (select coalesce(sum(rr.decided), 0)::integer from rep_rows rr where rr.org_id = c.id and rr.practiced),
         (select count(*)::integer from rep_rows rr where rr.org_id = c.id and not rr.practiced),
         (select coalesce(sum(rr.won), 0)::integer from rep_rows rr where rr.org_id = c.id and not rr.practiced),
         (select coalesce(sum(rr.decided), 0)::integer from rep_rows rr where rr.org_id = c.id and not rr.practiced)
  from companies c
  left join sims on sims.org_id = c.id
  order by c.name;
end;
$$;

revoke all on function team_rep_summary(uuid, timestamptz, uuid)            from public, anon;
revoke all on function portfolio_company_summary(uuid, timestamptz, integer) from public, anon;
grant execute on function team_rep_summary(uuid, timestamptz, uuid)            to authenticated;
grant execute on function portfolio_company_summary(uuid, timestamptz, integer) to authenticated;
