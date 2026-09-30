-- ============================================================================
-- TRUSS 0018 — Portfolios, operating companies, and branches
-- ============================================================================
-- Until now an organization was a flat tenant. The customer this is built for
-- is not flat: a sponsor or holding company owns several contracting companies,
-- each with branches, each branch with a manager and a crew. Three things follow.
--
-- A portfolio is an organization of kind 'portfolio'. Operating companies point
-- at it with parent_org_id. One level only — a portfolio does not sit inside
-- another portfolio — which is how these businesses are actually run and keeps
-- every check below a single join rather than a recursive walk.
--
-- The holding company's standard flows down. Its playbook rules, its knowledge
-- base, and its published roleplay scenarios are readable by every member of
-- every company beneath it, so an acquired company starts on the house method
-- the day it is added. A company's own material still sits alongside, and the
-- TRUSS guardrails still sit above both.
--
-- Portfolio leaders see numbers, not people's conversations. A portfolio's
-- owners, admins, and managers can read the organizations beneath it and call
-- the rollup functions in 0023, which return aggregates. They get no row access
-- to a company's scorecards, transcripts, or accounts. A company's own managers
-- keep that, as before, and Coach conversations remain private to the rep.

create type org_kind as enum ('company', 'portfolio');

alter table organizations
  add column kind org_kind not null default 'company',
  add column parent_org_id uuid references organizations (id) on delete set null;

create index organizations_parent_idx on organizations (parent_org_id) where parent_org_id is not null;

comment on column organizations.kind is
  'company: an operating tenant. portfolio: a holding company whose standard flows to the companies that name it as parent.';
comment on column organizations.parent_org_id is
  'The portfolio this company belongs to. Set only by operators (admin_set_org_hierarchy).';

-- The shape rules, enforced whoever writes the row.
create or replace function organizations_check_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_org_id is not null then
    if new.parent_org_id = new.id then
      raise exception 'A company cannot be its own portfolio.' using errcode = '23514';
    end if;
    if new.kind <> 'company' then
      raise exception 'A portfolio cannot sit inside another portfolio.' using errcode = '23514';
    end if;
    if not exists (select 1 from organizations where id = new.parent_org_id and kind = 'portfolio') then
      raise exception 'The parent must be a portfolio.' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.kind = 'company' and old.kind = 'portfolio'
     and exists (select 1 from organizations where parent_org_id = new.id) then
    raise exception 'Move this portfolio''s companies out before making it a company.' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger organizations_check_hierarchy
  before insert or update of parent_org_id, kind on organizations
  for each row execute function organizations_check_hierarchy();

-- ─── Who can see across the hierarchy ───────────────────────────────────────

-- True when the caller leads the portfolio that target_org belongs to. Widened
-- for operators the same way 0008 widened the membership helpers.
create or replace function is_portfolio_viewer(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_platform_admin() or exists (
    select 1
    from organizations o
    join memberships m on m.org_id = o.parent_org_id
    where o.id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'manager')
  );
$$;

-- True when the caller belongs to a company whose portfolio is target_org, so
-- the portfolio's standard material reaches them.
create or replace function inherits_from(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    join organizations o on o.id = m.org_id
    where m.user_id = auth.uid()
      and o.parent_org_id = target_org
  );
$$;

revoke all on function is_portfolio_viewer(uuid) from public, anon;
revoke all on function inherits_from(uuid)       from public, anon;
grant execute on function is_portfolio_viewer(uuid) to authenticated;
grant execute on function inherits_from(uuid)       to authenticated;

-- Deliberately no row policy on organizations for either direction. The row
-- carries Stripe ids and billing state, and neither a portfolio leader nor a
-- company's reps need the other's. The name is all anyone is shown — reps see
-- it beside inherited rules so they know where a rule came from — so it is
-- served on its own.
create or replace function org_parent_summary(p_org uuid)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name
  from organizations o
  join organizations p on p.id = o.parent_org_id
  where o.id = p_org and is_org_member(p_org);
$$;

revoke all on function org_parent_summary(uuid) from public, anon;
grant execute on function org_parent_summary(uuid) to authenticated;

create policy org_settings_inherited_read on org_settings
  for select using (inherits_from(org_id));

create policy knowledge_documents_inherited_read on knowledge_documents
  for select using (inherits_from(org_id));

create policy knowledge_chunks_inherited_read on knowledge_chunks
  for select using (inherits_from(org_id));

-- Only published scenarios travel down; drafts stay with their authors.
create policy custom_scenarios_inherited_read on custom_scenarios
  for select using (is_published and inherits_from(org_id));

-- ─── Retrieval reaches the portfolio's material too ─────────────────────────
-- Same signature and still SECURITY INVOKER, so RLS decides what matches: a
-- member sees their company's chunks by membership and their portfolio's by
-- inheritance, and nobody else's by either. Company material is preferred on a
-- near tie, because it is the more specific of the two.

create or replace function match_knowledge(
  query_embedding vector(1536),
  target_org      uuid,
  match_count     int default 6,
  min_similarity  float default 0.25
)
returns table (
  chunk_id       uuid,
  document_id    uuid,
  content        text,
  citation_label text,
  similarity     float
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    c.content,
    coalesce(d.citation_label, d.title) as citation_label,
    1 - (c.embedding <=> query_embedding) as similarity
  from knowledge_chunks c
  join knowledge_documents d on d.id = c.document_id
  where (
      c.org_id = target_org
      or c.org_id = (select o.parent_org_id from organizations o where o.id = target_org)
    )
    and d.status = 'ready'
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > min_similarity
  order by (c.embedding <=> query_embedding) - case when c.org_id = target_org then 0.02 else 0 end
  limit match_count;
$$;

-- ─── Branches ───────────────────────────────────────────────────────────────
-- A grouping inside a company — a location, a region, a sales team — used to
-- filter the team dashboard and roll numbers up. It is not a security boundary:
-- a company's managers see the whole company, as they do today.

create table branches (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  name        text not null constraint branches_name_len check (length(btrim(name)) between 1 and 80),
  created_at  timestamptz not null default now(),
  unique (org_id, name),
  unique (id, org_id)
);

alter table branches enable row level security;

create policy branches_read on branches
  for select using (is_org_member(org_id));

create policy branches_write on branches
  for all using (is_org_admin(org_id)) with check (is_org_admin(org_id));

-- The composite key keeps a membership from naming another company's branch.
-- ON DELETE SET NULL (branch_id) clears only the branch when one is deleted.
alter table memberships
  add column branch_id uuid,
  add constraint memberships_branch_fk
    foreign key (branch_id, org_id) references branches (id, org_id)
    on delete set null (branch_id);

create index memberships_branch_idx on memberships (org_id, branch_id);

-- ─── Operator control of the hierarchy ──────────────────────────────────────
-- Tenants cannot move themselves in or out of a portfolio: which companies a
-- holding company can see is a contract matter, and 0016 already withdrew
-- column-level UPDATE on organizations from every client role.

create or replace function admin_set_org_hierarchy(
  p_org    uuid,
  p_kind   org_kind,
  p_parent uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before record;
begin
  perform require_platform_admin();

  select kind, parent_org_id into v_before from organizations where id = p_org;
  if v_before is null then
    raise exception 'No such organization.' using errcode = '23503';
  end if;

  update organizations
  set kind = p_kind,
      parent_org_id = case when p_kind = 'portfolio' then null else p_parent end,
      updated_at = now()
  where id = p_org;

  perform log_admin_action('org.set_hierarchy', p_org, null,
    jsonb_build_object('kind_from', v_before.kind, 'kind_to', p_kind,
                       'parent_from', v_before.parent_org_id, 'parent_to', p_parent));
end;
$$;

revoke all on function admin_set_org_hierarchy(uuid, org_kind, uuid) from public, anon;
grant execute on function admin_set_org_hierarchy(uuid, org_kind, uuid) to authenticated;
