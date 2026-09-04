-- ============================================================================
-- TRUSS 0001 — Organizations, profiles, membership, and tenant isolation
-- ============================================================================
-- Every table in TRUSS is scoped to an organization. A subscription customer is
-- an org of one to a few reps. An Enterprise customer is an org with its own
-- settings, playbook, and knowledge base. The same code serves both because
-- isolation is enforced in the database, not in application code.

create extension if not exists "pgcrypto";

-- ─── Organizations ──────────────────────────────────────────────────────────

create type org_plan as enum ('free', 'pro', 'team', 'enterprise');

create table organizations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  slug                    text not null unique,
  plan                    org_plan not null default 'free',
  -- Billing. Null until the org subscribes. Enterprise orgs are billed offline.
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  subscription_status     text,
  current_period_end      timestamptz,
  -- Seat cap enforced at invite time. Null means unlimited (Enterprise).
  seat_limit              integer,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table organizations is
  'A TRUSS customer. Subscription customers and Enterprise tenants are both orgs; the plan column distinguishes them.';

-- ─── Profiles ───────────────────────────────────────────────────────────────
-- One row per auth user. Carries the locale, because a large share of this
-- workforce reads Spanish first, and the currently active org.

create table profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  phone          text,
  locale         text not null default 'en' check (locale in ('en', 'es')),
  active_org_id  uuid references organizations (id) on delete set null,
  avatar_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── Membership ─────────────────────────────────────────────────────────────

create type org_role as enum ('owner', 'admin', 'manager', 'rep');

create table memberships (
  org_id      uuid not null references organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        org_role not null default 'rep',
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index memberships_user_idx on memberships (user_id);

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  email       text not null,
  role        org_role not null default 'rep',
  token       text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by  uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at  timestamptz not null default now() + interval '14 days',
  created_at  timestamptz not null default now(),
  unique (org_id, email)
);

-- ─── Org settings ───────────────────────────────────────────────────────────
-- What makes an Enterprise deployment feel custom: their trades, their service
-- area, and the rules their reps are held to. These are injected into every
-- Coach prompt as reference context.

create table org_settings (
  org_id           uuid primary key references organizations (id) on delete cascade,
  trades           text[] not null default '{}',
  service_area     text[] not null default '{}',
  playbook_rules   text[] not null default '{}',
  -- Enterprise branding for a white-labeled deployment.
  brand_name       text,
  brand_logo_url   text,
  brand_color      text,
  -- Default language for new reps in this org.
  default_locale   text not null default 'en' check (default_locale in ('en', 'es')),
  updated_at       timestamptz not null default now()
);

-- ─── Isolation helpers ──────────────────────────────────────────────────────
-- SECURITY DEFINER so policies on memberships can call them without recursing
-- through the very policy being evaluated.

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function org_role_of(target_org uuid)
returns org_role
language sql
stable
security definer
set search_path = public
as $$
  select role from memberships
  where org_id = target_org and user_id = auth.uid();
$$;

create or replace function is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(org_role_of(target_org) in ('owner', 'admin'), false);
$$;

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table organizations enable row level security;
alter table profiles      enable row level security;
alter table memberships   enable row level security;
alter table invitations   enable row level security;
alter table org_settings  enable row level security;

create policy org_select on organizations
  for select using (is_org_member(id));

create policy org_update on organizations
  for update using (is_org_admin(id)) with check (is_org_admin(id));

create policy profile_select_self on profiles
  for select using (id = auth.uid());

-- Managers need to see the reps they coach.
create policy profile_select_teammates on profiles
  for select using (
    exists (
      select 1 from memberships m_self
      join memberships m_other on m_other.org_id = m_self.org_id
      where m_self.user_id = auth.uid()
        and m_other.user_id = profiles.id
        and m_self.role in ('owner', 'admin', 'manager')
    )
  );

create policy profile_upsert_self on profiles
  for insert with check (id = auth.uid());

create policy profile_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy membership_select on memberships
  for select using (is_org_member(org_id));

create policy membership_write on memberships
  for all using (is_org_admin(org_id)) with check (is_org_admin(org_id));

create policy invitation_manage on invitations
  for all using (is_org_admin(org_id)) with check (is_org_admin(org_id));

create policy org_settings_select on org_settings
  for select using (is_org_member(org_id));

create policy org_settings_write on org_settings
  for all using (is_org_admin(org_id)) with check (is_org_admin(org_id));

-- ─── New user bootstrap ─────────────────────────────────────────────────────
-- Creates a profile on signup. Org creation is deliberately a separate,
-- explicit step so onboarding can ask what company the rep works for.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'locale', 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── updated_at ─────────────────────────────────────────────────────────────

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_touch before update on organizations
  for each row execute function touch_updated_at();
create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
create trigger org_settings_touch before update on org_settings
  for each row execute function touch_updated_at();
