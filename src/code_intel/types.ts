/** Production Code Intel contracts — language-agnostic. */

export type ParserBackend = "tree-sitter" | "generic" | "regex-fallback";
export type Confidence = "high" | "medium" | "low";
export type IndexMode = "full" | "incremental";
export type DegradationMode = "none" | "no-wasm" | "parser-error" | "timeout";

export interface IndexedSymbol {
  name: string;
  kind: string;
  filePath: string;
  startLine: number;
  endLine: number;
  exported: boolean;
  signature?: string;
  language: string;
  confidence: Confidence;
  parser: ParserBackend;
}

export interface IndexedEdge {
  from: string;
  to: string;
  relation: "imports" | "calls" | "extends" | "implements" | "references" | "exports";
  filePath: string;
  language: string;
  confidence: Confidence;
}

export interface IndexedFile {
  path: string;
  language: string;
  sizeBytes: number;
  contentHash: string;
}

export interface ParseResult {
  symbols: IndexedSymbol[];
  edges: IndexedEdge[];
  degradation?: DegradationMode;
}

export interface LanguageParser {
  readonly languageId: string;
  readonly extensions: readonly string[];
  parse(filePath: string, content: string): Promise<ParseResult>;
}

export interface IndexStats {
  filesSeen: number;
  filesParsed: number;
  filesSkipped: number;
  filesUnchanged: number;
  byLanguage: Record<string, number>;
  parseErrors: number;
  durationMs: number;
  mode: IndexMode;
  degradation: DegradationMode;
  notes: string[];
}

export interface IndexQuery {
  workspacePath: string;
  query: string;
  symbolHint?: string;
  /** Soft budget; engine uses time/size caps rather than toy hard limits. */
  maxFiles?: number;
  forceFull?: boolean;
}

export interface IndexResult {
  files: IndexedFile[];
  symbols: IndexedSymbol[];
  edges: IndexedEdge[];
  impactedPaths: string[];
  summary: string;
  stats: IndexStats;
}

export interface SymbolIndexer {
  index(query: IndexQuery): Promise<IndexResult>;
}

export interface EnsureIndexOptions {
  workspacePath: string;
  forceFull?: boolean;
  maxFiles?: number;
  signal?: AbortSignal;
}

export interface IndexEngine {
  ensureIndex(options: EnsureIndexOptions): Promise<IndexStats>;
  search(query: IndexQuery): Promise<IndexResult>;
  getStats(): IndexStats | null;
}

export interface SymbolMatch {
  name: string;
  kind: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  confidence: Confidence;
}

export interface ReferenceMatch {
  symbol: string;
  filePath: string;
  line: number;
  excerpt: string;
  confidence: Confidence;
  source: "l3-edge" | "ripgrep" | "generic";
}

export interface SearchBackend {
  findSymbols(workspacePath: string, symbol: string): Promise<SymbolMatch[]>;
  findReferences(workspacePath: string, symbol: string): Promise<ReferenceMatch[]>;
}

export interface LanguageServerAdapter {
  definitions(
    workspacePath: string,
    filePath: string,
    line: number,
    character: number,
  ): Promise<SymbolMatch[]>;
  references(
    workspacePath: string,
    filePath: string,
    line: number,
    character: number,
  ): Promise<ReferenceMatch[]>;
  hover(
    workspacePath: string,
    filePath: string,
    line: number,
    character: number,
  ): Promise<string | null>;
}

export const DEFAULT_MAX_FILE_BYTES = 1_500_000;
export const DEFAULT_PARSE_CONCURRENCY = 6;
export const DEFAULT_PARSE_TIMEOUT_MS = 3_000;
export const DEFAULT_MAX_FILES = 20_000;
