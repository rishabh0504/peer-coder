import { LanguageRegistry, languageFromExtension } from "../languages/registry.js";
import { createGenericTextParser } from "../parsers/generic_text.js";
import {
  createCParser,
  createCppParser,
  createGoParser,
  createJavaParser,
  createJavascriptParser,
  createPythonParser,
  createRustParser,
  createTsxParser,
  createTypescriptParser,
} from "../parsers/tree_sitter/languages.js";
import { ensureTreeSitterRuntime } from "../parsers/tree_sitter/runtime.js";
import {
  HybridSearch,
  type IndexedWorkspaceSnapshot,
  snapshotToIndexResult,
} from "../search/hybrid_search.js";
import {
  DEFAULT_MAX_FILES,
  DEFAULT_PARSE_CONCURRENCY,
  DEFAULT_PARSE_TIMEOUT_MS,
  type DegradationMode,
  type EnsureIndexOptions,
  type IndexEngine,
  type IndexQuery,
  type IndexResult,
  type IndexStats,
  type IndexedEdge,
  type IndexedFile,
  type IndexedSymbol,
  type LanguageParser,
} from "../types.js";
import { walkRepo } from "../walk/repo_walker.js";

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      const item = items[i];
      if (item === undefined) continue;
      results[i] = await fn(item);
    }
  });
  await Promise.all(workers);
  return results;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("parse timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export class PolyglotIndexEngine implements IndexEngine {
  private snapshot: IndexedWorkspaceSnapshot | null = null;
  private lastStats: IndexStats | null = null;
  private readonly registry = new LanguageRegistry();
  private readonly generic = createGenericTextParser();
  readonly searchBackend: HybridSearch;
  private wasmReady: boolean | null = null;

  constructor() {
    this.registry.setGeneric(this.generic);
    for (const p of [
      createTypescriptParser(),
      createTsxParser(),
      createJavascriptParser(),
      createPythonParser(),
      createGoParser(),
      createRustParser(),
      createJavaParser(),
      createCParser(),
      createCppParser(),
    ]) {
      this.registry.register(p);
    }
    this.searchBackend = new HybridSearch(() => this.snapshot);
  }

  getStats(): IndexStats | null {
    return this.lastStats;
  }

  private async ensureWasm(): Promise<DegradationMode> {
    if (this.wasmReady === true) return "none";
    if (this.wasmReady === false) return "no-wasm";
    try {
      await ensureTreeSitterRuntime();
      this.wasmReady = true;
      return "none";
    } catch {
      this.wasmReady = false;
      return "no-wasm";
    }
  }

  private resolveParser(ext: string): LanguageParser {
    if (process.env.PEER_CODER_CODE_INTEL_FALLBACK === "regex") {
      return this.generic;
    }
    if (this.wasmReady === false) return this.generic;
    return this.registry.resolve(ext) ?? this.generic;
  }

  async ensureIndex(options: EnsureIndexOptions): Promise<IndexStats> {
    const started = Date.now();
    const workspacePath = options.workspacePath;
    const degradation = await this.ensureWasm();
    const walked = await walkRepo({
      workspacePath,
      maxFiles: options.maxFiles ?? DEFAULT_MAX_FILES,
      signal: options.signal,
    });

    const prev = this.snapshot?.workspacePath === workspacePath ? this.snapshot : null;
    const mode = options.forceFull || !prev ? "full" : "incremental";

    const files: IndexedFile[] = [];
    const symbols: IndexedSymbol[] = [];
    const edges: IndexedEdge[] = [];
    const hashByPath = new Map<string, string>();
    const byLanguage: Record<string, number> = {};
    let filesParsed = 0;
    let filesUnchanged = 0;
    let parseErrors = 0;
    const notes: string[] = [];
    if (degradation === "no-wasm") {
      notes.push("tree-sitter WASM unavailable — using generic text parsers");
    }

    const toParse = walked.files.filter((f) => {
      hashByPath.set(f.relativePath, f.contentHash);
      if (mode === "incremental" && prev?.hashByPath.get(f.relativePath) === f.contentHash) {
        filesUnchanged++;
        return false;
      }
      return true;
    });

    // Carry forward unchanged symbols/edges/files from previous snapshot
    if (mode === "incremental" && prev) {
      const unchangedPaths = new Set(
        walked.files
          .filter((f) => prev.hashByPath.get(f.relativePath) === f.contentHash)
          .map((f) => f.relativePath),
      );
      for (const f of prev.files) {
        if (unchangedPaths.has(f.path)) files.push(f);
      }
      for (const s of prev.symbols) {
        if (unchangedPaths.has(s.filePath)) symbols.push(s);
      }
      for (const e of prev.edges) {
        if (unchangedPaths.has(e.filePath)) edges.push(e);
      }
    }

    await mapPool(toParse, DEFAULT_PARSE_CONCURRENCY, async (f) => {
      const language = languageFromExtension(f.extension);
      byLanguage[language] = (byLanguage[language] ?? 0) + 1;
      const parser = this.resolveParser(f.extension);
      try {
        const parsed = await withTimeout(
          parser.parse(f.relativePath, f.content),
          DEFAULT_PARSE_TIMEOUT_MS,
        );
        filesParsed++;
        files.push({
          path: f.relativePath,
          language,
          sizeBytes: f.sizeBytes,
          contentHash: f.contentHash,
        });
        // If tree-sitter returned empty due to no-wasm, try generic
        let result = parsed;
        if (
          (parsed.degradation === "no-wasm" || parsed.symbols.length === 0) &&
          parser.languageId !== "generic"
        ) {
          result = await this.generic.parse(f.relativePath, f.content);
          result.symbols = result.symbols.map((s) => ({ ...s, language }));
        } else {
          result.symbols = result.symbols.map((s) => ({ ...s, language }));
          result.edges = result.edges.map((e) => ({ ...e, language }));
        }
        symbols.push(...result.symbols);
        edges.push(...result.edges);
        if (result.degradation && result.degradation !== "none") {
          parseErrors++;
        }
      } catch {
        parseErrors++;
        try {
          const fallback = await this.generic.parse(f.relativePath, f.content);
          files.push({
            path: f.relativePath,
            language,
            sizeBytes: f.sizeBytes,
            contentHash: f.contentHash,
          });
          symbols.push(...fallback.symbols.map((s) => ({ ...s, language })));
          filesParsed++;
        } catch {
          // skip
        }
      }
    });

    this.snapshot = { workspacePath, files, symbols, edges, hashByPath };
    const stats: IndexStats = {
      filesSeen: walked.filesSeen,
      filesParsed,
      filesSkipped: walked.filesSkipped,
      filesUnchanged,
      byLanguage,
      parseErrors,
      durationMs: Date.now() - started,
      mode,
      degradation,
      notes,
    };
    this.lastStats = stats;
    return stats;
  }

  async search(query: IndexQuery): Promise<IndexResult> {
    const stats = await this.ensureIndex({
      workspacePath: query.workspacePath,
      forceFull: query.forceFull,
      maxFiles: query.maxFiles,
    });
    if (!this.snapshot) {
      return {
        files: [],
        symbols: [],
        edges: [],
        impactedPaths: [],
        summary: "No index available",
        stats,
      };
    }
    const q = query.symbolHint ?? query.query;
    return snapshotToIndexResult(this.snapshot, q, stats);
  }
}

let singleton: PolyglotIndexEngine | null = null;

export function getIndexEngine(): PolyglotIndexEngine {
  if (!singleton) singleton = new PolyglotIndexEngine();
  return singleton;
}
