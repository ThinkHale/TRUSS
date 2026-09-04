-- ============================================================================
-- TRUSS 0003 — Accounts, contacts, activity, and campaigns
-- ============================================================================
-- Accounts in TRUSS are properties and property owners, not staffing prospects.
-- The defining fields are the ones that decide a trades deal: the carrier, the
-- deductible, where the claim stands, and which TRUSS stage the rep is in.

create type account_type   as enum ('residential', 'commercial');
create type claim_status   as enum (
  'none', 'considering', 'filed', 'adjuster-scheduled',
  'adjuster-met', 'approved', 'partially-approved', 'denied', 'supplementing', 'closed'
);
create type account_status as enum ('lead', 'inspected', 'signed', 'in-production', 'complete', 'lost');

create table accounts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  owner_user_id   uuid references auth.users (id) on delete set null,

  name            text not null,
  type            account_type not null default 'residential',

  address         text,
  city            text,
  state           text,
  postal_code     text,
  lat             double precision,
  lng             double precision,
  google_place_id text,

  status          account_status not null default 'lead',
  -- Where this account sits in the methodology right now. Drives the Coach.
  truss_stage     truss_stage not null default 'trust',

  -- The fields that actually decide an insurance-restoration deal.
  carrier         text,
  policy_number   text,
  claim_number    text,
  claim_status    claim_status not null default 'none',
  claim_filed_on  date,
  deductible_cents integer check (deductible_cents is null or deductible_cents >= 0),
  date_of_loss    date,

  -- Language the homeowner prefers to be sold in.
  preferred_language text not null default 'en' check (preferred_language in ('en', 'es')),

  estimated_value_cents integer,
  notes           text,
  tags            text[] not null default '{}',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index accounts_org_idx        on accounts (org_id, updated_at desc);
create index accounts_owner_idx      on accounts (owner_user_id, updated_at desc);
create index accounts_status_idx     on accounts (org_id, status);
create index accounts_stage_idx      on accounts (org_id, truss_stage);
create index accounts_geo_idx        on accounts (lat, lng);

create table contacts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  account_id  uuid not null references accounts (id) on delete cascade,
  name        text not null,
  -- Whether this person can actually sign. Missing this loses deals.
  is_decision_maker boolean not null default false,
  relationship text,
  phone       text,
  email       text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'es')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index contacts_account_idx on contacts (account_id);

-- ─── Activity ───────────────────────────────────────────────────────────────

create type activity_type as enum (
  'knock', 'call', 'text', 'email', 'inspection',
  'adjuster-meeting', 'presentation', 'signed', 'note'
);

create table activities (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  account_id   uuid references accounts (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         activity_type not null,
  -- Which stage the rep was working when this happened.
  stage        truss_stage,
  outcome      text,
  notes        text,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index activities_account_idx on activities (account_id, occurred_at desc);
create index activities_user_idx    on activities (user_id, occurred_at desc);
create index activities_org_idx     on activities (org_id, occurred_at desc);

-- ─── Campaigns ──────────────────────────────────────────────────────────────
-- Outreach that complements the Coach: every piece is tagged with the TRUSS
-- stage it serves, so a rep knows when to use it.

create type campaign_channel as enum ('door-hanger', 'text', 'email', 'voicemail', 'postcard', 'social');

create table campaigns (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  created_by   uuid references auth.users (id) on delete set null,
  name         text not null,
  -- What this campaign is reacting to, e.g. "April 14 hail, Cedar Ridge".
  trigger_note text,
  audience     text,
  stage        truss_stage not null default 'trust',
  -- Generated pieces: [{ channel, language, subject, body, stage }]
  pieces       jsonb not null default '[]',
  area_research_id uuid,
  status       text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index campaigns_org_idx on campaigns (org_id, updated_at desc);

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Accounts are shared across the org. A rep who knocks a door needs to see that
-- a teammate already signed it, or two trucks show up at the same house.

alter table accounts   enable row level security;
alter table contacts   enable row level security;
alter table activities enable row level security;
alter table campaigns  enable row level security;

create policy accounts_org on accounts
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy contacts_org on contacts
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy activities_org_read on activities
  for select using (is_org_member(org_id));

create policy activities_own_write on activities
  for insert with check (user_id = auth.uid() and is_org_member(org_id));

create policy activities_own_update on activities
  for update using (user_id = auth.uid() or is_org_admin(org_id))
  with check (user_id = auth.uid() or is_org_admin(org_id));

create policy activities_own_delete on activities
  for delete using (user_id = auth.uid() or is_org_admin(org_id));

create policy campaigns_org on campaigns
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create trigger accounts_touch  before update on accounts
  for each row execute function touch_updated_at();
create trigger contacts_touch  before update on contacts
  for each row execute function touch_updated_at();
create trigger campaigns_touch before update on campaigns
  for each row execute function touch_updated_at();
