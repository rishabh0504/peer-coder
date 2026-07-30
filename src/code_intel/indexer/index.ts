/**
 * Public Code Intel facade — language-agnostic.
 * Default path: PolyglotIndexEngine (tree-sitter + generic + hybrid search).
 */
export type {
  SymbolIndexer,
  IndexQuery,
  IndexResult,
  IndexStats,
  IndexedSymbol,
  IndexedEdge,
  IndexedFile,
  IndexEngine,
  SearchBackend,
  LanguageParser,
  LanguageServerAdapter,
} from "../types.js";

export { getIndexEngine, PolyglotIndexEngine } from "../index/engine.js";
export { HybridSearch } from "../search/hybrid_search.js";
export {
  NoopLanguageServerAdapter,
  DetectingLanguageServerAdapter,
  detectLanguageServers,
  getLanguageServerAdapter,
} from "../lsp/index.js";
export { walkRepo } from "../walk/repo_walker.js";
export { LanguageRegistry, languageFromExtension } from "../languages/registry.js";

import { getIndexEngine } from "../index/engine.js";
import type { IndexQuery, IndexResult, SymbolIndexer } from "../types.js";

/** @deprecated Use getIndexEngine().search — kept for handler compatibility */
export class PolyglotIndexer implements SymbolIndexer {
  async index(query: IndexQuery): Promise<IndexResult> {
    return getIndexEngine().search(query);
  }
}

/** Default indexer for agents/tools — never TS-only. */
export function createDefaultIndexer(): SymbolIndexer {
  return new PolyglotIndexer();
}

/** Emergency regex/generic-only mode via env is handled inside the engine. */
export { createGenericTextParser } from "../parsers/generic_text.js";
