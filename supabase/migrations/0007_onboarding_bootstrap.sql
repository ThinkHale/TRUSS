-- ============================================================================
-- TRUSS 0007 — Let a new user actually create their first organization
-- ============================================================================
-- 0001 enabled RLS on organizations but only ever defined select and update
-- policies, so every insert was denied and onboarding could not complete.
-- Adding an insert policy alone is not enough: membership_write requires
-- is_org_admin(org_id), which is false until the owner row exists, so the very
-- first membership would still be rejected. Onboarding is a bootstrap problem —
-- it has to establish the rows the policies read before those policies can pass.
--
-- Doing it in one SECURITY DEFINER function keeps that exception in a single
-- audited place and makes the four writes atomic, so a failure halfway through
-- can no longer strand a user with an org they are not a member of.

create or replace function create_organization(
  p_name         text,
  p_trades       text[] default '{}',
  p_service_area text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_name  text := btrim(p_name);
  v_base  text;
  v_slug  text;
  v_org   uuid;
begin
  if v_user is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  if v_name = '' or v_name is null then
    raise exception 'A company name is required.' using errcode = '22023';
  end if;

  if length(v_name) > 200 then
    raise exception 'That company name is too long.' using errcode = '22023';
  end if;

  v_base := nullif(btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-'), '');
  v_base := coalesce(left(v_base, 40), 'company');

  -- Retry rather than trusting a random suffix to be unique on the first try.
  loop
    v_slug := v_base || '-' || encode(extensions.gen_random_bytes(3), 'hex');
    exit when not exists (select 1 from organizations where slug = v_slug);
  end loop;

  insert into organizations (name, slug, plan, seat_limit)
  values (v_name, v_slug, 'free', 1)
  returning id into v_org;

  -- The caller is always the owner. Taking the user from auth.uid() rather than
  -- a parameter is what keeps this function safe to expose to any signed-in user.
  insert into memberships (org_id, user_id, role)
  values (v_org, v_user, 'owner');

  insert into org_settings (org_id, trades, service_area)
  values (v_org, coalesce(p_trades, '{}'), coalesce(p_service_area, '{}'));

  update profiles set active_org_id = v_org, updated_at = now()
  where id = v_user;

  return v_org;
end;
$$;

comment on function create_organization(text, text[], text[]) is
  'Creates an org and makes the caller its owner. SECURITY DEFINER because the RLS policies on memberships and org_settings read rows this call is in the middle of creating.';

revoke all on function create_organization(text, text[], text[]) from public, anon;
grant execute on function create_organization(text, text[], text[]) to authenticated;
