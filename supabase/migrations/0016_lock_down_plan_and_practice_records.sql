-- ============================================================================
-- TRUSS 0016 — Close three writes a signed-in user should never have had
-- ============================================================================
-- Same shape as 0014: a policy that reads as "a member may manage their own
-- rows" also let them edit the columns that decide what they pay for and what
-- their manager sees. All three are reachable from the browser with the
-- publishable anon key and a normal session.
--
-- 1. organizations. org_update let an owner or admin update any column of
--    their own org. Everyone who signs up is the owner of the org onboarding
--    creates, so any new account could set plan_override = 'enterprise' with no
--    expiry, clear seat_limit, or rewrite its Stripe ids — unlimited AI and
--    unlimited seats for nothing. Nothing in the app updates this table with a
--    user's session: billing columns are written by the Stripe webhook and the
--    operator functions, both of which bypass RLS. So the table-wide UPDATE
--    grant is withdrawn and only the display name stays editable.
--
-- 2. scorecards. scorecards_own was FOR ALL, so a rep could rewrite their own
--    scores, headline, and summary — which is exactly what their manager reads
--    to decide who needs coaching. Reps keep read access to their own; writes
--    come only from the scoring route, which now uses the service role.
--
-- 3. practice_sessions. Practice minutes are billed from started_at and the
--    sweep that bills abandoned sessions looks for status active or scoring.
--    A rep could move started_at forward before scoring, or mark a session
--    completed so the sweep never found it — free Realtime audio, the most
--    expensive thing the product buys. Reps keep insert and read; updates come
--    only from the practice routes, which now use the service role.
--
-- The routes were changed first and work under either policy set, so this can
-- be applied at any time after that deploy.

-- ─── 1. Organizations: only the name is user-editable ───────────────────────

revoke update on organizations from authenticated, anon;
grant update (name) on organizations to authenticated;

-- The row policy still applies on top of the column grant: only an owner or
-- admin of that org can rename it.

-- ─── 2. Scorecards: read your own, write nothing ────────────────────────────

drop policy if exists scorecards_own on scorecards;

create policy scorecards_own_read on scorecards
  for select using (user_id = auth.uid() and is_org_member(org_id));

revoke insert, update, delete on scorecards from authenticated, anon;

-- ─── 3. Practice sessions: start and read your own, never edit them ─────────

drop policy if exists practice_sessions_own on practice_sessions;

create policy practice_sessions_own_read on practice_sessions
  for select using (user_id = auth.uid() and is_org_member(org_id));

create policy practice_sessions_own_insert on practice_sessions
  for insert with check (user_id = auth.uid() and is_org_member(org_id));

revoke update, delete on practice_sessions from authenticated, anon;

-- A session always starts now. Without this a direct insert could backdate or
-- postdate the clock the bill is computed from.
create or replace function practice_sessions_stamp_start()
returns trigger
language plpgsql
as $$
begin
  new.started_at := now();
  new.status := 'active';
  new.ended_at := null;
  new.duration_seconds := null;
  return new;
end;
$$;

drop trigger if exists practice_sessions_stamp_start on practice_sessions;
create trigger practice_sessions_stamp_start before insert on practice_sessions
  for each row execute function practice_sessions_stamp_start();
