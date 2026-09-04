-- ============================================================================
-- TRUSS 0002 — TRUSS Coach conversations and voice roleplay practice
-- ============================================================================
-- This is the heart of the product. Coach conversations are ongoing chats.
-- Practice sessions are timed spoken roleplays that produce a TRUSS scorecard,
-- which is what turns practice into measurable rep development.

create type truss_stage as enum ('trust', 'relate', 'understand', 'solve', 'secure');

-- ─── Coach conversations ────────────────────────────────────────────────────

create table coach_conversations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null default 'New conversation',
  -- Set when the rep is drilling one stage rather than asking generally.
  stage_focus  truss_stage,
  -- Optional link to the account this conversation is about.
  account_id   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index coach_conversations_user_idx
  on coach_conversations (user_id, updated_at desc);

create table coach_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references coach_conversations (id) on delete cascade,
  org_id           uuid not null references organizations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null,
  -- Knowledge-base chunks cited in this answer, for Enterprise traceability.
  citations        jsonb not null default '[]',
  token_count      integer,
  created_at       timestamptz not null default now()
);

create index coach_messages_conversation_idx
  on coach_messages (conversation_id, created_at);

-- ─── Practice sessions ──────────────────────────────────────────────────────

create type practice_mode   as enum ('voice', 'text');
create type practice_status as enum ('active', 'completed', 'abandoned', 'scoring', 'scored');

create table practice_sessions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  -- References a scenario in code, or a custom scenario for Enterprise orgs.
  scenario_id       text not null,
  custom_scenario_id uuid,
  mode              practice_mode not null default 'voice',
  status            practice_status not null default 'active',
  language          text not null default 'en' check (language in ('en', 'es')),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  duration_seconds  integer,
  created_at        timestamptz not null default now()
);

create index practice_sessions_user_idx
  on practice_sessions (user_id, started_at desc);
create index practice_sessions_org_idx
  on practice_sessions (org_id, started_at desc);

-- Full transcript, one row per spoken turn. Kept so the rep can re-read what
-- they actually said, which is where most of the learning happens.
create table practice_turns (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references practice_sessions (id) on delete cascade,
  org_id       uuid not null references organizations (id) on delete cascade,
  role         text not null check (role in ('rep', 'character')),
  text         text not null,
  -- Milliseconds from session start. Lets the UI show pacing and talk ratio.
  offset_ms    integer,
  created_at   timestamptz not null default now()
);

create index practice_turns_session_idx on practice_turns (session_id, created_at);

-- ─── Scorecards ─────────────────────────────────────────────────────────────

create table scorecards (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null unique references practice_sessions (id) on delete cascade,
  org_id       uuid not null references organizations (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- Denormalized per-stage scores so progress charts do not have to parse jsonb.
  trust        smallint not null check (trust      between 0 and 4),
  relate       smallint not null check (relate     between 0 and 4),
  understand   smallint not null check (understand between 0 and 4),
  solve        smallint not null check (solve      between 0 and 4),
  secure       smallint not null check (secure     between 0 and 4),
  total_score  smallint generated always as (trust + relate + understand + solve + secure) stored,
  outcome      text not null check (outcome in ('signed', 'next-step-set', 'no-commitment', 'lost')),
  headline     text not null,
  summary      text not null,
  -- Full per-stage detail: evidence quotes, what went well, better lines.
  stages       jsonb not null,
  created_at   timestamptz not null default now()
);

create index scorecards_user_idx on scorecards (user_id, created_at desc);
create index scorecards_org_idx  on scorecards (org_id, created_at desc);

-- Rep progress over time, and the stage a manager should coach next.
create or replace view rep_progress as
select
  s.user_id,
  s.org_id,
  count(*)                        as sessions_scored,
  round(avg(s.total_score), 1)    as avg_total,
  round(avg(s.trust), 1)          as avg_trust,
  round(avg(s.relate), 1)         as avg_relate,
  round(avg(s.understand), 1)     as avg_understand,
  round(avg(s.solve), 1)          as avg_solve,
  round(avg(s.secure), 1)         as avg_secure,
  max(s.created_at)               as last_practiced_at
from scorecards s
group by s.user_id, s.org_id;

-- ─── Enterprise custom scenarios ────────────────────────────────────────────
-- An Enterprise customer can author roleplay characters that match their real
-- market, their products, and the objections their reps actually hear.

create table custom_scenarios (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations (id) on delete cascade,
  title            text not null,
  setup            text not null,
  character_brief  text not null,
  objections       text[] not null default '{}',
  difficulty       text not null default 'moderate'
                     check (difficulty in ('easy', 'moderate', 'hard')),
  focus_stages     truss_stage[] not null default '{}',
  persona          text not null default 'homeowner',
  voice            text not null default 'ash',
  language         text not null default 'en' check (language in ('en', 'es')),
  created_by       uuid references auth.users (id) on delete set null,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index custom_scenarios_org_idx on custom_scenarios (org_id, is_published);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table coach_conversations enable row level security;
alter table coach_messages      enable row level security;
alter table practice_sessions   enable row level security;
alter table practice_turns      enable row level security;
alter table scorecards          enable row level security;
alter table custom_scenarios    enable row level security;

-- Coach conversations are private to the rep. A manager cannot read them.
-- Reps will not be honest with a coach their boss is reading.
create policy coach_conversations_own on coach_conversations
  for all using (user_id = auth.uid() and is_org_member(org_id))
  with check (user_id = auth.uid() and is_org_member(org_id));

create policy coach_messages_own on coach_messages
  for all using (
    exists (
      select 1 from coach_conversations c
      where c.id = coach_messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from coach_conversations c
      where c.id = coach_messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- Practice sessions belong to the rep, but managers can review them. Training
-- is meant to be coachable, and reps are told this up front.
create policy practice_sessions_own on practice_sessions
  for all using (user_id = auth.uid() and is_org_member(org_id))
  with check (user_id = auth.uid() and is_org_member(org_id));

create policy practice_sessions_manager_read on practice_sessions
  for select using (
    org_role_of(org_id) in ('owner', 'admin', 'manager')
  );

create policy practice_turns_own on practice_turns
  for all using (
    exists (
      select 1 from practice_sessions s
      where s.id = practice_turns.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from practice_sessions s
      where s.id = practice_turns.session_id and s.user_id = auth.uid()
    )
  );

create policy practice_turns_manager_read on practice_turns
  for select using (org_role_of(org_id) in ('owner', 'admin', 'manager'));

create policy scorecards_own on scorecards
  for all using (user_id = auth.uid() and is_org_member(org_id))
  with check (user_id = auth.uid() and is_org_member(org_id));

create policy scorecards_manager_read on scorecards
  for select using (org_role_of(org_id) in ('owner', 'admin', 'manager'));

create policy custom_scenarios_read on custom_scenarios
  for select using (is_org_member(org_id));

create policy custom_scenarios_write on custom_scenarios
  for all using (org_role_of(org_id) in ('owner', 'admin', 'manager'))
  with check (org_role_of(org_id) in ('owner', 'admin', 'manager'));

create trigger coach_conversations_touch before update on coach_conversations
  for each row execute function touch_updated_at();
create trigger custom_scenarios_touch before update on custom_scenarios
  for each row execute function touch_updated_at();
