import { getDetectingLspAdapter, preferLspHits } from "../lsp/detecting_adapter.js";
import type {
  IndexResult,
  IndexStats,
  IndexedEdge,
  IndexedFile,
  IndexedSymbol,
  ReferenceMatch,
  SearchBackend,
  SymbolMatch,
} from "../types.js";
import { ripgrepHitsToReferences, ripgrepSearch } from "./ripgrep_backend.js";

export interface IndexedWorkspaceSnapshot {
  workspacePath: string;
  files: IndexedFile[];
  symbols: IndexedSymbol[];
  edges: IndexedEdge[];
  hashByPath: Map<string, string>;
}

export class HybridSearch implements SearchBackend {
  constructor(private getSnapshot: () => IndexedWorkspaceSnapshot | null) {}

  async findSymbols(workspacePath: string, symbol: string): Promise<SymbolMatch[]> {
    const snap = this.getSnapshot();
    const needle = symbol.toLowerCase();
    const fromIndex =
      snap && snap.workspacePath === workspacePath
        ? snap.symbols
            .filter((s) => s.name.toLowerCase() === needle || s.name.toLowerCase().includes(needle))
            .map(
              (s): SymbolMatch => ({
                name: s.name,
                kind: s.kind,
                filePath: s.filePath,
                startLine: s.startLine,
                endLine: s.endLine,
                language: s.language,
                confidence: s.confidence,
              }),
            )
        : [];

    // Rank: exact > prefix > contains
    fromIndex.sort((a, b) => rank(a.name, needle) - rank(b.name, needle));

    const lsp = getDetectingLspAdapter();
    if (fromIndex.length > 0) {
      const sliced = fromIndex.slice(0, 50);
      return lsp ? preferLspHits(lsp, sliced) : sliced;
    }

    // Degradation: ripgrep for identifier occurrences as low-confidence symbols
    const hits = await ripgrepSearch(workspacePath, symbol, { maxHits: 30 });
    const degraded = hits.slice(0, 20).map((h) => ({
      name: symbol,
      kind: "reference",
      filePath: h.filePath,
      startLine: h.line,
      endLine: h.line,
      language: "unknown",
      confidence: "low" as const,
    }));
    return lsp ? preferLspHits(lsp, degraded) : degraded;
  }

  async findReferences(workspacePath: string, symbol: string): Promise<ReferenceMatch[]> {
    const snap = this.getSnapshot();
    const edgeRefs: ReferenceMatch[] = [];
    if (snap && snap.workspacePath === workspacePath) {
      for (const e of snap.edges) {
        if (e.to === symbol || e.from.includes(symbol)) {
          edgeRefs.push({
            symbol,
            filePath: e.filePath,
            line: 1,
            excerpt: `${e.relation} ${e.from} → ${e.to}`,
            confidence: e.confidence,
            source: "l3-edge",
          });
        }
      }
    }

    const rg = ripgrepHitsToReferences(
      symbol,
      await ripgrepSearch(workspacePath, symbol, { maxHits: 80 }),
    );

    const seen = new Set<string>();
    const out: ReferenceMatch[] = [];
    for (const r of [...edgeRefs, ...rg]) {
      const key = `${r.filePath}:${r.line}:${r.excerpt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length >= 100) break;
    }
    const lsp = getDetectingLspAdapter();
    return lsp ? preferLspHits(lsp, out) : out;
  }
}

function rank(name: string, needle: string): number {
  const n = name.toLowerCase();
  if (n === needle) return 0;
  if (n.startsWith(needle)) return 1;
  return 2;
}

export function snapshotToIndexResult(
  snap: IndexedWorkspaceSnapshot,
  query: string,
  stats: IndexStats,
): IndexResult {
  const needle = (query || "").toLowerCase();
  const symbols = needle
    ? snap.symbols.filter(
        (s) => s.name.toLowerCase().includes(needle) || s.filePath.toLowerCase().includes(needle),
      )
    : snap.symbols;
  const impacted = new Set(symbols.map((s) => s.filePath));
  const files = snap.files.filter((f) => impacted.has(f.path) || !needle);

  return {
    files: files.slice(0, 100),
    symbols: symbols.slice(0, 150),
    edges: snap.edges.filter((e) => impacted.has(e.filePath) || !needle).slice(0, 200),
    impactedPaths: [...impacted].slice(0, 80),
    summary: `Indexed ${stats.filesParsed} files (${stats.mode}); matched ${symbols.length} symbols for "${query}" across languages [${Object.keys(stats.byLanguage).join(", ")}].`,
    stats,
  };
}
