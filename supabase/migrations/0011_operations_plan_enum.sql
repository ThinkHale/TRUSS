-- ============================================================================
-- TRUSS 0011 — An 'operations' plan for the people running the platform
-- ============================================================================
-- An operator whose own company sits on 'free' is not just labelled oddly; they
-- are held to 30 Coach messages a month while trying to support customers.
--
-- This is its own migration because Postgres will not let a new enum value be
-- USED in the transaction that adds it. 0012 inserts the entitlements row and
-- backfills; the two cannot be merged.

alter type org_plan add value if not exists 'operations' after 'enterprise';
