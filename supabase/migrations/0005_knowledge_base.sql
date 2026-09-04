-- ============================================================================
-- TRUSS 0005 — Enterprise knowledge base (retrieval-augmented Coach)
-- ============================================================================
-- This is what makes an Enterprise deployment genuinely custom rather than
-- re-skinned: the customer's own training material, playbooks, pricing rules,
-- warranty terms, and process documents are chunked, embedded, and retrieved
-- into the Coach's context at question time.
--
-- Isolation is critical here. One tenant's playbook must never surface in
-- another tenant's Coach, so org_id lives on the chunk table itself and every
-- retrieval path filters on it inside a SECURITY INVOKER function that RLS
-- still applies to.

create extension if not exists vector;

create type knowledge_source as enum (
  'upload', 'pasted', 'url', 'transcript', 'policy', 'pricing', 'training'
);

create type knowledge_status as enum ('pending', 'processing', 'ready', 'failed');

create table knowledge_documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  title        text not null,
  source_type  knowledge_source not null default 'upload',
  source_uri   text,
  -- Free-text label the Coach cites, e.g. "2026 Sales Playbook, p. 14".
  citation_label text,
  status       knowledge_status not null default 'pending',
  error_message text,
  -- Restricts which stages this document informs. Empty means all.
  stage_tags   truss_stage[] not null default '{}',
  byte_size    integer,
  chunk_count  integer not null default 0,
  uploaded_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index knowledge_documents_org_idx on knowledge_documents (org_id, created_at desc);

create table knowledge_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references knowledge_documents (id) on delete cascade,
  -- Denormalized from the parent so retrieval can filter without a join.
  org_id       uuid not null references organizations (id) on delete cascade,
  chunk_index  integer not null,
  content      text not null,
  -- Must match EMBEDDING_DIMENSIONS in src/lib/ai/openai.ts (text-embedding-3-small).
  embedding    vector(1536),
  token_count  integer,
  created_at   timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index knowledge_chunks_org_idx on knowledge_chunks (org_id);

-- IVFFlat over cosine distance. Rebuild with a larger list count once a tenant
-- exceeds roughly 100k chunks.
create index knowledge_chunks_embedding_idx
  on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ─── Retrieval ──────────────────────────────────────────────────────────────
-- SECURITY INVOKER on purpose: RLS still applies, so a caller can only ever
-- match chunks belonging to an org they are a member of. The explicit org_id
-- filter narrows it further to the org the request is actually scoped to.

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
  where c.org_id = target_org
    and d.status = 'ready'
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table knowledge_documents enable row level security;
alter table knowledge_chunks    enable row level security;

-- Any member can read what the Coach cites. Only admins and managers curate.
create policy knowledge_documents_read on knowledge_documents
  for select using (is_org_member(org_id));

create policy knowledge_documents_write on knowledge_documents
  for all using (org_role_of(org_id) in ('owner', 'admin', 'manager'))
  with check (org_role_of(org_id) in ('owner', 'admin', 'manager'));

create policy knowledge_chunks_read on knowledge_chunks
  for select using (is_org_member(org_id));

create policy knowledge_chunks_write on knowledge_chunks
  for all using (org_role_of(org_id) in ('owner', 'admin', 'manager'))
  with check (org_role_of(org_id) in ('owner', 'admin', 'manager'));

create trigger knowledge_documents_touch before update on knowledge_documents
  for each row execute function touch_updated_at();
