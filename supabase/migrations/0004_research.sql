-- ============================================================================
-- TRUSS 0004 — Area research
-- ============================================================================
-- A saved research brief for a neighborhood, ZIP, or town: what the weather is
-- doing, what storms have hit, and what is worth working. Cached because the
-- underlying Google and NOAA calls cost money and rate-limit.

create table area_research (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organizations (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,

  query              text not null,
  formatted_address  text not null,
  lat                double precision not null,
  lng                double precision not null,
  state              text,
  postal_code        text,
  radius_miles       integer not null default 10,

  -- Raw provider payloads, kept so a brief can be re-rendered without re-billing.
  weather_current    jsonb,
  weather_forecast   jsonb,
  work_windows       jsonb,
  storm_signal       jsonb,
  places             jsonb,

  -- The generated narrative brief the rep actually reads.
  brief              text,

  created_at         timestamptz not null default now()
);

create index area_research_org_idx  on area_research (org_id, created_at desc);
create index area_research_user_idx on area_research (user_id, created_at desc);
create index area_research_geo_idx  on area_research (lat, lng);

alter table campaigns
  add constraint campaigns_area_research_fk
  foreign key (area_research_id) references area_research (id) on delete set null;

alter table area_research enable row level security;

-- Research is shared across the org. If one rep pulled a brief for a
-- neighborhood, the whole crew should benefit from it.
create policy area_research_org on area_research
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
