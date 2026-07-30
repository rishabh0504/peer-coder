# Code Intelligence (Production)

**Product invariant:** Peer-Coder Code Intel is **language-agnostic**. JS/TS is one plugin among many — never the product boundary.

## Architecture

```text
code_intelligence agent / find_symbol / find_references
        │
        ▼
  PolyglotIndexEngine
        │
  ┌─────┼──────────────┐
  │     │              │
Walk  Parsers      HybridSearch
(.gitignore)  (tree-sitter / generic)  (L3 ∪ ripgrep)
```

| Component | Path |
|-----------|------|
| Contracts | [`src/code_intel/types.ts`](../src/code_intel/types.ts) |
| Repo walk | [`src/code_intel/walk/repo_walker.ts`](../src/code_intel/walk/repo_walker.ts) |
| Language registry | [`src/code_intel/languages/registry.ts`](../src/code_intel/languages/registry.ts) |
| Index engine | [`src/code_intel/index/engine.ts`](../src/code_intel/index/engine.ts) |
| Tree-sitter runtime | [`src/code_intel/parsers/tree_sitter/`](../src/code_intel/parsers/tree_sitter/) |
| Hybrid search | [`src/code_intel/search/`](../src/code_intel/search/) |
| LSP seam | [`src/code_intel/lsp/`](../src/code_intel/lsp/) — `DetectingLanguageServerAdapter` prefers hits when `typescript-language-server` / `pyright` / `gopls` / `rust-analyzer` is on PATH (`PEER_CODER_LSP=0` disables) |

## Supported languages (v1 parsers)

Tree-sitter WASM via `tree-sitter-wasms`:

- TypeScript / TSX / JavaScript
- Python
- Go
- Rust
- Java
- C / C++

**Generic text parser** covers other indexable extensions and WASM degradation (`confidence: low`).

## How to add a language

1. Add extensions → language id in `languages/registry.ts`
2. Add WASM grammar (or reuse generic)
3. Register a `LanguageParser` in `PolyglotIndexEngine` constructor
4. Add a fixture under `tests/fixtures/polyglot/<lang>/`
5. **Do not** change the `code_intelligence` agent module

## Degradation matrix

| Failure | Behavior |
|---------|----------|
| WASM init fails | Generic text parser for all files; `stats.degradation = no-wasm` |
| Per-file parse error/timeout | Generic fallback for that file; counted in `parseErrors` |
| `rg` missing | Node walk line-scan for references |
| `PEER_CODER_CODE_INTEL_FALLBACK=regex` | Force generic path (debug) |

## Production SLOs

- Python-only / Go-only fixtures return real symbols with **zero** `.ts` files
- Incremental warm index skips unchanged `content_hash`
- Tools never return hard-coded empty arrays
- Binaries / oversized files skipped with stats
- Adding a language does not touch agent code

## Related

- [Agent build roadmap](./agent-build-roadmap.md)
- [Memory LLD — L3](./memory-lld.md)
