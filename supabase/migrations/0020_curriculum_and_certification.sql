-- ============================================================================
-- TRUSS 0020 — The eight-week program, run inside the product
-- ============================================================================
-- The TRUSS Eight-Week Training Program (repository docs/06_training) existed as
-- a document. A company could read it; nothing in the product ran it. This is
-- the part that turns TRUSS from software a rep can open into a program a
-- company can put its people through and hold them to.
--
-- The program's content — each week's focus, pre-work, field target, and
-- measure — lives in code (src/lib/truss/curriculum.ts), versioned with the
-- knowledge base it comes from. The database holds only what happens to
-- people: who is in which cohort, what they submitted each week, what their
-- manager confirmed, and who earned the credential.
--
-- Certification follows the program document, criterion for criterion:
--
--   "no critical violation in the final two simulations"      checked here
--   "at least 75 of 100 on the context-adjusted TRUSS rubric"  checked here
--   "demonstration of one successful field behavior change"    checked here
--   "at least 80 percent routing accuracy"                     manager attests
--   "accurate use of evidence, limitations, and next steps"    manager attests
--
-- Every week's module must also be complete: pre-work and field evidence from
-- the rep, and the manager's check. The checks run in SQL so the application
-- cannot issue a credential the data does not support, and a manager cannot
-- certify themselves.

create table cohorts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  name        text not null constraint cohorts_name_len check (length(btrim(name)) between 1 and 120),
  program_id  text not null default 'truss-8wk' check (program_id in ('truss-8wk')),
  starts_on   date not null,
  branch_id   uuid,
  created_by  uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, org_id),
  constraint cohorts_branch_fk foreign key (branch_id, org_id)
    references branches (id, org_id) on delete set null (branch_id)
);

create index cohorts_org_idx on cohorts (org_id, starts_on desc);

create table cohort_members (
  cohort_id  uuid not null,
  org_id     uuid not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (cohort_id, user_id),
  foreign key (cohort_id, org_id) references cohorts (id, org_id) on delete cascade,
  -- Only people in the company can be enrolled in its cohort.
  foreign key (org_id, user_id) references memberships (org_id, user_id) on delete cascade
);

create index cohort_members_user_idx on cohort_members (user_id);

create table module_progress (
  cohort_id            uuid not null,
  org_id               uuid not null,
  user_id              uuid not null references auth.users (id) on delete cascade,
  week                 smallint not null check (week between 1 and 8),
  prework_response     text constraint module_prework_len check (prework_response is null or length(prework_response) <= 8000),
  prework_submitted_at timestamptz,
  field_evidence       text constraint module_field_len check (field_evidence is null or length(field_evidence) <= 8000),
  field_submitted_at   timestamptz,
  manager_note         text constraint module_note_len check (manager_note is null or length(manager_note) <= 4000),
  manager_checked_at   timestamptz,
  manager_checked_by   uuid references auth.users (id) on delete set null,
  updated_at           timestamptz not null default now(),
  primary key (cohort_id, user_id, week),
  foreign key (cohort_id, user_id) references cohort_members (cohort_id, user_id) on delete cascade
);

create table certifications (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  cohort_id       uuid references cohorts (id) on delete set null,
  program_id      text not null default 'truss-8wk',
  credential_code text not null unique,
  -- The evidence the credential was issued on, frozen at issue time.
  evidence        jsonb not null,
  issued_by       uuid references auth.users (id) on delete set null,
  issued_at       timestamptz not null default now(),
  revoked_at      timestamptz,
  revoked_reason  text
);

-- One live credential per person per program per company.
create unique index certifications_live_uidx
  on certifications (org_id, user_id, program_id) where revoked_at is null;
create index certifications_org_idx on certifications (org_id, issued_at desc);

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Everything is readable by the person it is about and by their company's
-- managers. Every write goes through a function below.

alter table cohorts         enable row level security;
alter table cohort_members  enable row level security;
alter table module_progress enable row level security;
alter table certifications  enable row level security;

create policy cohorts_read on cohorts
  for select using (is_org_member(org_id));

create policy cohorts_write on cohorts
  for all using (org_role_of(org_id) in ('owner', 'admin', 'manager'))
  with check (org_role_of(org_id) in ('owner', 'admin', 'manager'));

create policy cohort_members_read on cohort_members
  for select using (
    (user_id = auth.uid() and is_org_member(org_id))
    or org_role_of(org_id) in ('owner', 'admin', 'manager')
  );

create policy cohort_members_write on cohort_members
  for all using (org_role_of(org_id) in ('owner', 'admin', 'manager'))
  with check (org_role_of(org_id) in ('owner', 'admin', 'manager'));

create policy module_progress_read on module_progress
  for select using (
    (user_id = auth.uid() and is_org_member(org_id))
    or org_role_of(org_id) in ('owner', 'admin', 'manager')
  );

create policy certifications_read on certifications
  for select using (
    (user_id = auth.uid() and is_org_member(org_id))
    or org_role_of(org_id) in ('owner', 'admin', 'manager')
  );

revoke insert, update, delete on module_progress from authenticated, anon;
revoke insert, update, delete on certifications  from authenticated, anon;

create trigger cohorts_touch before update on cohorts
  for each row execute function touch_updated_at();

-- ─── The rep's side: submitting a week's work ───────────────────────────────

create or replace function submit_module_work(
  p_cohort uuid,
  p_week   integer,
  p_kind   text,
  p_text   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  select cm.org_id into v_org
  from cohort_members cm
  join cohorts c on c.id = cm.cohort_id
  where cm.cohort_id = p_cohort and cm.user_id = auth.uid() and c.archived_at is null;

  if v_org is null then
    raise exception 'You are not in that cohort.' using errcode = '42501';
  end if;
  if p_week not between 1 and 8 then
    raise exception 'There is no such week.' using errcode = '22023';
  end if;
  if p_kind not in ('prework', 'field') then
    raise exception 'Unknown submission.' using errcode = '22023';
  end if;
  if v_text = '' then
    raise exception 'Write something first.' using errcode = '22023';
  end if;
  if length(v_text) > 8000 then
    raise exception 'That is too long. Keep it under 8,000 characters.' using errcode = '22023';
  end if;

  insert into module_progress (cohort_id, org_id, user_id, week)
  values (p_cohort, v_org, auth.uid(), p_week)
  on conflict (cohort_id, user_id, week) do nothing;

  -- Resubmitting after a manager's check reopens the week: the check was of
  -- the old answer, not this one.
  if p_kind = 'prework' then
    update module_progress
    set prework_response = v_text, prework_submitted_at = now(),
        manager_checked_at = null, manager_checked_by = null, updated_at = now()
    where cohort_id = p_cohort and user_id = auth.uid() and week = p_week;
  else
    update module_progress
    set field_evidence = v_text, field_submitted_at = now(),
        manager_checked_at = null, manager_checked_by = null, updated_at = now()
    where cohort_id = p_cohort and user_id = auth.uid() and week = p_week;
  end if;
end;
$$;

-- ─── The manager's side: the weekly check ───────────────────────────────────

create or replace function record_manager_check(
  p_cohort uuid,
  p_user   uuid,
  p_week   integer,
  p_note   text default null,
  p_clear  boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_row module_progress%rowtype;
begin
  select org_id into v_org from cohorts where id = p_cohort;
  if v_org is null then
    raise exception 'No such cohort.' using errcode = '23503';
  end if;
  if coalesce(org_role_of(v_org) in ('owner', 'admin', 'manager'), false) is not true then
    raise exception 'Only managers can check a week.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'Someone else has to check your work.' using errcode = '42501';
  end if;
  if length(coalesce(p_note, '')) > 4000 then
    raise exception 'That note is too long.' using errcode = '22023';
  end if;

  select * into v_row from module_progress
  where cohort_id = p_cohort and user_id = p_user and week = p_week;

  if not p_clear and (v_row is null or v_row.prework_submitted_at is null or v_row.field_submitted_at is null) then
    raise exception 'The rep has not submitted both parts of this week yet.' using errcode = '22023';
  end if;

  update module_progress
  set manager_checked_at = case when p_clear then null else now() end,
      manager_checked_by = case when p_clear then null else auth.uid() end,
      manager_note       = coalesce(nullif(btrim(p_note), ''), manager_note),
      updated_at         = now()
  where cohort_id = p_cohort and user_id = p_user and week = p_week;
end;
$$;

-- ─── Certification ──────────────────────────────────────────────────────────

-- Where someone stands against the criteria. The rep sees their own; managers
-- see their team's. Also what issue_certification() checks against, so the
-- screen and the gate cannot disagree.
create or replace function certification_status(p_cohort uuid, p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cohort        cohorts%rowtype;
  v_modules_done  integer;
  v_sessions      integer;
  v_latest        integer;
  v_final_two     integer;
  v_final_two_bad integer;
  v_week8_checked boolean;
  v_field_pass    boolean;
  v_cert          certifications%rowtype;
begin
  select * into v_cohort from cohorts where id = p_cohort;
  if v_cohort.id is null then
    raise exception 'No such cohort.' using errcode = '23503';
  end if;
  if not (
    (p_user = auth.uid() and is_org_member(v_cohort.org_id))
    or coalesce(org_role_of(v_cohort.org_id) in ('owner', 'admin', 'manager'), false)
  ) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if not exists (select 1 from cohort_members where cohort_id = p_cohort and user_id = p_user) then
    raise exception 'That person is not in this cohort.' using errcode = '23503';
  end if;

  select count(*) into v_modules_done
  from module_progress
  where cohort_id = p_cohort and user_id = p_user
    and prework_submitted_at is not null
    and field_submitted_at is not null
    and manager_checked_at is not null;

  -- Simulations taken since the cohort started, newest first.
  select count(*) into v_sessions
  from scorecards
  where org_id = v_cohort.org_id and user_id = p_user and created_at >= v_cohort.starts_on;

  select weighted_score into v_latest
  from scorecards
  where org_id = v_cohort.org_id and user_id = p_user and created_at >= v_cohort.starts_on
  order by created_at desc
  limit 1;

  select count(*), count(*) filter (where has_critical)
    into v_final_two, v_final_two_bad
  from (
    select has_critical from scorecards
    where org_id = v_cohort.org_id and user_id = p_user and created_at >= v_cohort.starts_on
    order by created_at desc
    limit 2
  ) last_two;

  select coalesce(bool_or(manager_checked_at is not null and field_submitted_at is not null), false)
    into v_week8_checked
  from module_progress
  where cohort_id = p_cohort and user_id = p_user and week = 8;

  select exists (
    select 1 from field_reviews
    where org_id = v_cohort.org_id and user_id = p_user
      and created_at >= v_cohort.starts_on
      and truss_is_passing(weighted_score, has_critical)
  ) into v_field_pass;

  select * into v_cert from certifications
  where org_id = v_cohort.org_id and user_id = p_user and program_id = v_cohort.program_id
    and revoked_at is null;

  return jsonb_build_object(
    'modules_completed',      v_modules_done,
    'modules_total',          8,
    'simulations',            v_sessions,
    'latest_weighted',        v_latest,
    'rubric_met',             coalesce(v_latest, 0) >= 75,
    'final_two_clean',        v_final_two = 2 and v_final_two_bad = 0,
    'field_behavior_shown',   v_week8_checked or v_field_pass,
    'field_review_passed',    v_field_pass,
    'eligible',               v_modules_done = 8
                                and coalesce(v_latest, 0) >= 75
                                and v_final_two = 2 and v_final_two_bad = 0
                                and (v_week8_checked or v_field_pass),
    'certified',              v_cert.id is not null,
    'credential_code',        v_cert.credential_code,
    'issued_at',              v_cert.issued_at
  );
end;
$$;

create or replace function issue_certification(
  p_cohort            uuid,
  p_user              uuid,
  p_routing_attested  boolean,
  p_evidence_attested boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cohort cohorts%rowtype;
  v_status jsonb;
  v_code   text;
begin
  select * into v_cohort from cohorts where id = p_cohort;
  if v_cohort.id is null then
    raise exception 'No such cohort.' using errcode = '23503';
  end if;
  if coalesce(org_role_of(v_cohort.org_id) in ('owner', 'admin', 'manager'), false) is not true then
    raise exception 'Only managers can certify.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'Someone else has to certify you.' using errcode = '42501';
  end if;
  if not (coalesce(p_routing_attested, false) and coalesce(p_evidence_attested, false)) then
    raise exception 'Both manager attestations are required.' using errcode = '22023';
  end if;

  v_status := certification_status(p_cohort, p_user);
  if (v_status ->> 'certified')::boolean then
    raise exception 'Already certified.' using errcode = '23505';
  end if;
  if not (v_status ->> 'eligible')::boolean then
    raise exception 'Not every certification criterion is met yet.' using errcode = '23514';
  end if;

  -- 40 bits, grouped so it can be read out loud: TRS-XXXXX-XXXXX.
  loop
    v_code := upper(encode(extensions.gen_random_bytes(5), 'hex'));
    v_code := 'TRS-' || substr(v_code, 1, 5) || '-' || substr(v_code, 6, 5);
    exit when not exists (select 1 from certifications where credential_code = v_code);
  end loop;

  insert into certifications (org_id, user_id, cohort_id, program_id, credential_code, evidence, issued_by)
  values (
    v_cohort.org_id, p_user, p_cohort, v_cohort.program_id, v_code,
    v_status || jsonb_build_object('routing_attested', true, 'evidence_attested', true),
    auth.uid()
  );

  perform log_org_action(v_cohort.org_id, 'certification.issue', p_user,
    jsonb_build_object('cohort_id', p_cohort, 'credential_code', v_code));

  return v_code;
end;
$$;

create or replace function revoke_certification(p_certification uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert certifications%rowtype;
begin
  select * into v_cert from certifications where id = p_certification;
  if v_cert.id is null then
    raise exception 'No such credential.' using errcode = '23503';
  end if;
  if not is_org_admin(v_cert.org_id) then
    raise exception 'Only owners and admins can revoke a credential.' using errcode = '42501';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Give a reason.' using errcode = '22023';
  end if;

  update certifications
  set revoked_at = now(), revoked_reason = left(btrim(p_reason), 500)
  where id = p_certification and revoked_at is null;

  perform log_org_action(v_cert.org_id, 'certification.revoke', v_cert.user_id,
    jsonb_build_object('credential_code', v_cert.credential_code, 'reason', left(btrim(p_reason), 500)));
end;
$$;

-- Public verification. A rep can show a credential code to a homeowner or a
-- future employer; anyone can check it. Returns only what the credential
-- itself states — never scores or evidence.
create or replace function verify_certification(p_code text)
returns table (
  holder_name  text,
  company_name text,
  program_id   text,
  issued_at    timestamptz,
  revoked      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name, o.name, c.program_id, c.issued_at, c.revoked_at is not null
  from certifications c
  join organizations o on o.id = c.org_id
  left join profiles p on p.id = c.user_id
  where c.credential_code = upper(btrim(p_code));
$$;

revoke all on function submit_module_work(uuid, integer, text, text)                from public, anon;
revoke all on function record_manager_check(uuid, uuid, integer, text, boolean)     from public, anon;
revoke all on function certification_status(uuid, uuid)                              from public, anon;
revoke all on function issue_certification(uuid, uuid, boolean, boolean)             from public, anon;
revoke all on function revoke_certification(uuid, text)                              from public, anon;
revoke all on function verify_certification(text)                                    from public;

grant execute on function submit_module_work(uuid, integer, text, text)            to authenticated;
grant execute on function record_manager_check(uuid, uuid, integer, text, boolean) to authenticated;
grant execute on function certification_status(uuid, uuid)                         to authenticated;
grant execute on function issue_certification(uuid, uuid, boolean, boolean)         to authenticated;
grant execute on function revoke_certification(uuid, text)                          to authenticated;
grant execute on function verify_certification(text)                                to anon, authenticated;
