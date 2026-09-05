-- ============================================================================
-- TRUSS 0009 — What a live billing integration needs that a demo does not
-- ============================================================================
-- 0006 metered usage and 0001 held the Stripe ids. This adds the three things
-- that only matter once real money is moving: a record of which webhook events
-- have already been applied, enough subscription state to tell a customer the
-- truth about their own account, and a seat count that invites can be checked
-- against.

-- ─── Webhook idempotency ────────────────────────────────────────────────────
-- Stripe redelivers. It redelivers on its own timeouts, on a non-2xx, and on
-- operator replay, and it does not promise to deliver in order. Without a
-- record of what has been applied, a redelivered checkout.session.completed
-- re-runs its writes, and an out-of-order subscription.updated can resurrect a
-- plan the customer already cancelled.

create table stripe_events (
  id           text primary key,
  type         text not null,
  org_id       uuid references organizations (id) on delete set null,
  received_at  timestamptz not null default now()
);

create index stripe_events_received_idx on stripe_events (received_at desc);

comment on table stripe_events is
  'Stripe event ids already applied. The webhook inserts before doing any work and treats a unique violation as "already handled".';

-- ─── Subscription state worth showing a customer ────────────────────────────

alter table organizations
  add column billing_email        text,
  add column cancel_at_period_end boolean not null default false,
  add column trial_ends_at        timestamptz;

comment on column organizations.cancel_at_period_end is
  'Set from Stripe. The subscription is still active but will not renew, which is what Settings has to say rather than "active".';

-- Stripe's customer id is the join key the webhook uses when a subscription
-- event arrives without a session. It was already unique; this makes the
-- lookup by subscription id cheap too.
create index if not exists organizations_stripe_subscription_idx
  on organizations (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ─── Seats ──────────────────────────────────────────────────────────────────
-- seat_limit has existed since 0001 but nothing counted against it. An invite
-- flow needs to know whether there is room.

create or replace function seats_in_use(target_org uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from memberships where org_id = target_org;
$$;

create or replace function seats_available(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- Null seat_limit means unlimited, which is how Enterprise orgs are set up.
    when (select seat_limit from organizations where id = target_org) is null then true
    else seats_in_use(target_org) < (select seat_limit from organizations where id = target_org)
  end;
$$;

grant execute on function seats_in_use(uuid)     to authenticated;
grant execute on function seats_available(uuid)  to authenticated;

-- stripe_events is written only by the webhook, which holds the service-role
-- key and bypasses RLS. Enabling RLS with no policy therefore locks the table
-- to every ordinary caller while leaving the webhook working.
alter table stripe_events enable row level security;

create policy stripe_events_admin_read on stripe_events
  for select using (is_platform_admin());
