-- ============================================================================
-- TRUSS 0013 — Deleting a company must not strand its people
-- ============================================================================
-- 0010's admin_delete_organization deleted the row and let the foreign key do
-- the rest. profiles.active_org_id is ON DELETE SET NULL, so everyone whose
-- active org was the deleted one had their pointer blanked — and a blank
-- pointer sent them to onboarding, which then offered to build them a brand new
-- company, even when they were already a member of another one.
--
-- admin_remove_membership has always repointed. The delete path never did.
--
-- The application no longer depends on this being right: getSessionContext()
-- now falls back to any membership the user holds. But leaving the database in
-- a state the application has to paper over is how the next reader gets
-- surprised, so the pointer is moved here too.

create or replace function admin_delete_organization(
  p_org          uuid,
  p_confirm_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org record;
begin
  perform require_platform_admin();

  select id, name, subscription_status, stripe_subscription_id
    into v_org
  from organizations where id = p_org;

  if v_org is null then
    raise exception 'No such organization.' using errcode = '23503';
  end if;

  if lower(btrim(coalesce(p_confirm_name, ''))) <> lower(btrim(v_org.name)) then
    raise exception 'Type the company name exactly to confirm deletion.'
      using errcode = '22023';
  end if;

  if v_org.stripe_subscription_id is not null
     and coalesce(v_org.subscription_status, '') in ('active', 'trialing', 'past_due') then
    raise exception 'This company has a live Stripe subscription. Cancel it in Stripe first, or it will keep billing.'
      using errcode = '23514';
  end if;

  perform log_admin_action('org.delete', p_org, null,
    jsonb_build_object('org_id', p_org, 'name', v_org.name,
                       'members', (select count(*) from memberships where org_id = p_org)));

  -- Move everyone pointed at this org to another one they already belong to,
  -- before the cascade blanks the pointer. Null when they have nowhere else to
  -- go, which is the one case where onboarding is the right destination.
  update profiles p
  set active_org_id = (
        select m.org_id
        from memberships m
        where m.user_id = p.id and m.org_id <> p_org
        order by m.created_at
        limit 1
      ),
      updated_at = now()
  where p.active_org_id = p_org;

  delete from organizations where id = p_org;
end;
$$;

revoke all on function admin_delete_organization(uuid, text) from public, anon;
grant execute on function admin_delete_organization(uuid, text) to authenticated;
