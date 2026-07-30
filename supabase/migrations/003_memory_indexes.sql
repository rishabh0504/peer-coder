-- Deterministic indexes (primary recall path) + last-resort L4 vector RPC
-- Memory Planner must NOT call match_episodes on every request.
-- See docs/memory-lld.md §4 and §12.

-- ---------------------------------------------------------------------------
-- L1 tasks
-- ---------------------------------------------------------------------------

create index tasks_workspace_status_idx
  on public.tasks (workspace_id, status);

create index tasks_workspace_updated_idx
  on public.tasks (workspace_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- L2 repository facts — current view + history
-- ---------------------------------------------------------------------------

-- At most one *current* fact per (workspace, subject, predicate)
create unique index repository_facts_current_uidx
  on public.repository_facts (workspace_id, subject, predicate)
  where valid_until is null;

create index repository_facts_history_idx
  on public.repository_facts (workspace_id, subject, predicate, valid_from desc);

-- Current rows only (expires_at filtered at query time — now() is not immutable)
create index repository_facts_subject_current_idx
  on public.repository_facts (workspace_id, subject)
  where valid_until is null;

create index repository_facts_expires_idx
  on public.repository_facts (expires_at)
  where expires_at is not null;

-- ---------------------------------------------------------------------------
-- L3 files / symbols / edges
-- ---------------------------------------------------------------------------

create index files_workspace_path_idx
  on public.files (workspace_id, path);

create index files_path_trgm_idx
  on public.files using gin (path extensions.gin_trgm_ops);

create index files_content_hash_idx
  on public.files (workspace_id, content_hash);

create index symbols_workspace_name_idx
  on public.symbols (workspace_id, lower(name));

create index symbols_name_trgm_idx
  on public.symbols using gin (name extensions.gin_trgm_ops);

create index symbols_file_id_idx
  on public.symbols (file_id);

create index symbol_edges_from_idx
  on public.symbol_edges (from_symbol_id);

create index symbol_edges_to_idx
  on public.symbol_edges (to_symbol_id);

create index symbol_edges_workspace_relation_idx
  on public.symbol_edges (workspace_id, relation);

-- ---------------------------------------------------------------------------
-- L4 episodes — typed filter first; vector last
-- ---------------------------------------------------------------------------

create index episodes_workspace_type_created_idx
  on public.episodes (workspace_id, type, created_at desc)
  where forgotten_at is null;

create index episodes_task_idx
  on public.episodes (task_id)
  where task_id is not null;

create index episodes_related_files_idx
  on public.episodes using gin (related_files);

create index episodes_related_symbols_idx
  on public.episodes using gin (related_symbols);

create index episodes_expires_idx
  on public.episodes (expires_at)
  where expires_at is not null and forgotten_at is null;

-- HNSW only over rows that have embeddings (last-resort RAG)
create index episodes_embedding_hnsw_idx
  on public.episodes
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null and forgotten_at is null;

-- ---------------------------------------------------------------------------
-- L5 user preferences
-- ---------------------------------------------------------------------------

create index user_preferences_key_idx
  on public.user_preferences (key);

-- ---------------------------------------------------------------------------
-- Current facts helper view (deterministic L2 reads)
-- ---------------------------------------------------------------------------

create or replace view public.repository_facts_current as
select *
from public.repository_facts
where valid_until is null
  and (expires_at is null or expires_at > now());

comment on view public.repository_facts_current is
  'L2 current facts only. Prefer this for ContextBuilder systemMemory.';

-- ---------------------------------------------------------------------------
-- LAST RESORT: vector similarity over episodes
-- Do NOT use as MemoryManager / MemoryPlanner default entrypoint.
-- Prefer: filter by workspace_id + type + related_files/symbols first.
-- ---------------------------------------------------------------------------

create or replace function public.match_episodes(
  query_embedding extensions.vector(768),
  p_workspace_id uuid,
  match_threshold float default 0.7,
  match_count int default 8,
  p_types text[] default null,
  p_task_id uuid default null
)
returns table (
  id uuid,
  workspace_id uuid,
  task_id uuid,
  type text,
  summary text,
  related_files text[],
  related_symbols text[],
  source text,
  confidence real,
  importance real,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    e.id,
    e.workspace_id,
    e.task_id,
    e.type,
    e.summary,
    e.related_files,
    e.related_symbols,
    e.source,
    e.confidence,
    e.importance,
    e.created_at,
    (1 - (e.embedding <=> query_embedding))::float as similarity
  from public.episodes e
  where e.workspace_id = p_workspace_id
    and e.forgotten_at is null
    and e.embedding is not null
    and (e.expires_at is null or e.expires_at > now())
    and (p_types is null or e.type = any (p_types))
    and (p_task_id is null or e.task_id = p_task_id)
    and (1 - (e.embedding <=> query_embedding)) >= match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

comment on function public.match_episodes is
  'LAST RESORT L4 vector search. Memory Planner must try typed/deterministic layers first.';

-- Typed episode filter (preferred L4 path — no embedding)
create or replace function public.filter_episodes(
  p_workspace_id uuid,
  p_types text[] default null,
  p_task_id uuid default null,
  p_related_file text default null,
  p_related_symbol text default null,
  p_limit int default 20
)
returns setof public.episodes
language sql
stable
as $$
  select e.*
  from public.episodes e
  where e.workspace_id = p_workspace_id
    and e.forgotten_at is null
    and (e.expires_at is null or e.expires_at > now())
    and (p_types is null or e.type = any (p_types))
    and (p_task_id is null or e.task_id = p_task_id)
    and (p_related_file is null or p_related_file = any (e.related_files))
    and (p_related_symbol is null or p_related_symbol = any (e.related_symbols))
  order by e.importance desc, e.created_at desc
  limit p_limit;
$$;

comment on function public.filter_episodes is
  'Preferred L4 path: typed / file / symbol filters. No vector search.';
