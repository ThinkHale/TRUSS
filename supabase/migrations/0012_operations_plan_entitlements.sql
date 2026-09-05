-- ============================================================================
-- TRUSS 0012 — What the operations plan is allowed to do
-- ============================================================================
-- Null limits mean unlimited, the same way the enterprise row works. This plan
-- is never sold: planForPrice() in the application only ever returns 'pro' or
-- 'team', so no Stripe webhook can move an org onto it, and it is absent from
-- the pricing page. It is set by an operator, or granted automatically when
-- someone is made one.

insert into plan_entitlements
  (plan, monthly_coach_messages, monthly_practice_minutes, monthly_research_briefs,
   knowledge_documents, custom_scenarios, team_dashboard, white_label, seats_included)
values
  ('operations', null, null, null, null, true, true, true, 100)
on conflict (plan) do nothing;

-- Existing operators whose company is still on the free plan. Deliberately
-- scoped to 'free': an operator embedded in a paying or Enterprise tenant keeps
-- the plan that tenant is actually entitled to.
update organizations o
set plan = 'operations', updated_at = now()
where o.plan = 'free'
  and o.id in (
    select p.active_org_id
    from profiles p
    join platform_admins pa on pa.user_id = p.id
    where p.active_org_id is not null
  );

-- Granting operator access now carries the plan with it, so a new operator does
-- not get quota-limited on their first support call.
create or replace function admin_set_platform_admin(
  p_user  uuid,
  p_admin boolean,
  p_note  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  perform require_platform_admin();

  if p_admin then
    insert into platform_admins (user_id, note, granted_by)
    values (p_user, p_note, auth.uid())
    on conflict (user_id) do update set note = coalesce(excluded.note, platform_admins.note);

    select active_org_id into v_org from profiles where id = p_user;
    if v_org is not null then
      update organizations set plan = 'operations', updated_at = now()
      where id = v_org and plan = 'free';
    end if;

    perform log_admin_action('platform_admin.grant', v_org, p_user,
      jsonb_build_object('note', p_note));
  else
    if (select count(*) from platform_admins) <= 1 then
      raise exception 'That is the only platform administrator.' using errcode = '23514';
    end if;
    delete from platform_admins where user_id = p_user;
    -- The plan is left alone on revoke. Dropping someone to 'free' silently
    -- would delete access they may still be entitled to, and an operator can
    -- always set it deliberately.
    perform log_admin_action('platform_admin.revoke', null, p_user, '{}'::jsonb);
  end if;
end;
$$;

revoke all on function admin_set_platform_admin(uuid, boolean, text) from public, anon;
grant execute on function admin_set_platform_admin(uuid, boolean, text) to authenticated;
