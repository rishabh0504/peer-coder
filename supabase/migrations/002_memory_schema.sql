-- Memory agent-state schema (L1–L5 durable stores)
-- See docs/memory-lld.md. No RLS / auth in v1 — scope by workspace_id (path hash).
-- L0 execution state remains in-process Map; not persisted here.

-- ---------------------------------------------------------------------------
-- Workspace scope root
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  path_hash text not null,
  root_path text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_path_hash_key unique (path_hash)
);

comment on table public.workspaces is
  'CLI workspace scope root. path_hash = sha256(absolute root path). No user auth in v1.';

-- ---------------------------------------------------------------------------
-- L1 — Task memory
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  goal text not null,
  status text not null default 'active'
    check (status in ('active', 'done', 'abandoned')),
  title text,
  -- Full TaskState JSON: todos, completed, remaining, knownIssues, decisions,
  -- filesTouched, architectureNotes, etc.
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

comment on table public.tasks is
  'L1 task memory. O(1) getTask(taskId). TTL ≈ task lifetime; expires_at optional.';

comment on column public.tasks.payload is
  'Structured TaskState JSON — not embeddings, not chat history.';

-- ---------------------------------------------------------------------------
-- L2 — Repository facts (versioned triples)
-- ---------------------------------------------------------------------------

create table public.repository_facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  subject text not null,
  predicate text not null,
  object text not null,
  source text not null
    check (source in ('user', 'analyzer', 'agent', 'inference')),
  confidence real not null default 1.0
    check (confidence >= 0 and confidence <= 1),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  superseded_by uuid references public.repository_facts (id),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repository_facts_valid_range check (
    valid_until is null or valid_until >= valid_from
  )
);

comment on table public.repository_facts is
  'L2 versioned triples. No embeddings. History via valid_from/valid_until/superseded_by.';

comment on column public.repository_facts.valid_until is
  'NULL means current fact. Prefer supersession over delete when truth changes.';

-- ---------------------------------------------------------------------------
-- L3 — Code intelligence: files → symbols → edges
-- ---------------------------------------------------------------------------

create table public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  path text not null,
  language text,
  size_bytes bigint not null default 0,
  content_hash text not null,
  last_indexed_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_workspace_path_key unique (workspace_id, path)
);

comment on table public.files is
  'L3 file index — bootstrap for symbol/edge lookup. Mandatory for code intel.';

create table public.symbols (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  name text not null,
  kind text not null,
  start_line integer not null,
  end_line integer not null,
  exported boolean not null default false,
  signature text,
  source text
    check (source is null or source in ('user', 'analyzer', 'agent', 'inference')),
  confidence real
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint symbols_file_name_line_key unique (workspace_id, file_id, name, start_line),
  constraint symbols_line_range check (end_line >= start_line)
);

comment on table public.symbols is
  'L3 symbol index. Zero embeddings — deterministic name/file lookup.';

create table public.symbol_edges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  from_symbol_id uuid not null references public.symbols (id) on delete cascade,
  to_symbol_id uuid not null references public.symbols (id) on delete cascade,
  relation text not null
    check (relation in (
      'imports', 'calls', 'extends', 'implements', 'references', 'exports'
    )),
  created_at timestamptz not null default now(),
  constraint symbol_edges_unique unique (from_symbol_id, to_symbol_id, relation),
  constraint symbol_edges_no_self check (from_symbol_id <> to_symbol_id)
);

comment on table public.symbol_edges is
  'L3 symbol graph edges (imports/calls/extends/implements/references/exports).';

-- ---------------------------------------------------------------------------
-- L4 — Experience / episodic memory (small RAG corpus)
-- ---------------------------------------------------------------------------

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  type text not null
    check (type in (
      'decision', 'failure', 'solution', 'architecture_change', 'lesson'
    )),
  summary text not null,
  related_files text[] not null default '{}',
  related_symbols text[] not null default '{}',
  source text not null default 'agent'
    check (source in ('user', 'analyzer', 'agent', 'inference')),
  confidence real not null default 1.0
    check (confidence >= 0 and confidence <= 1),
  importance real not null default 1.0,
  -- Nullable until promoted to searchable; nomic-embed-text = 768 dims
  embedding extensions.vector(768),
  metadata jsonb not null default '{}'::jsonb,
  -- Failures default to 90 days at insert time in application / trigger; nullable for decisions
  expires_at timestamptz,
  forgotten_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.episodes is
  'L4 curated experience. Vector search is LAST RESORT — prefer typed filters first.';

comment on column public.episodes.embedding is
  'Optional 768-d embedding (nomic-embed-text). NULL until searchable promotion.';

comment on column public.episodes.expires_at is
  'Failure episodes: typically now()+90 days unless repeated. Decisions may be null.';

-- Default expires_at for failure episodes when not supplied
create or replace function public.episodes_default_failure_ttl()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'failure' and new.expires_at is null then
    new.expires_at := now() + interval '90 days';
  end if;
  return new;
end;
$$;

create trigger episodes_failure_ttl
  before insert on public.episodes
  for each row
  execute function public.episodes_default_failure_ttl();

-- ---------------------------------------------------------------------------
-- L5 — User preferences
-- ---------------------------------------------------------------------------

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  -- NULL workspace_id = global CLI user preference
  workspace_id uuid references public.workspaces (id) on delete cascade,
  key text not null,
  value text not null,
  source text not null default 'user'
    check (source in ('user', 'analyzer', 'agent', 'inference')),
  confidence real not null default 0.9
    check (confidence >= 0 and confidence <= 1),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique per workspace key; treat NULL workspace as a distinct global namespace
create unique index user_preferences_workspace_key_uidx
  on public.user_preferences (workspace_id, key)
  nulls not distinct;

comment on table public.user_preferences is
  'L5 tiny preference map. Hash lookup. expires_at NULL = forever until changed.';

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger repository_facts_set_updated_at
  before update on public.repository_facts
  for each row execute function public.set_updated_at();

create trigger files_set_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

create trigger symbols_set_updated_at
  before update on public.symbols
  for each row execute function public.set_updated_at();

create trigger episodes_set_updated_at
  before update on public.episodes
  for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();
