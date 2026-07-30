-- Memory substrate extensions
-- vector: L4 episode embeddings only (nomic-embed-text, 768 dims)
-- pg_trgm: deterministic fuzzy match on file paths / symbol names

create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;
