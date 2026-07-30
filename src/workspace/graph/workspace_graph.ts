import type { RepositoryProfile } from "../../agents/contracts/index.js";
import { repositoryProfileSchema } from "../../agents/contracts/index.js";
import { type PolyglotIndexEngine, getIndexEngine } from "../../code_intel/index/engine.js";
import {
  getDetectingLspAdapter,
  getLanguageServerAdapter,
  preferLspHits,
} from "../../code_intel/lsp/index.js";
import type { IndexStats, ReferenceMatch, SymbolMatch } from "../../code_intel/types.js";

/**
 * Shared Workspace Graph — agents query this; they must not rebuild indexes ad hoc.
 * Repository Analysis writes the profile; Code Intel queries symbols via IndexEngine.
 */
export class WorkspaceGraph {
  private profiles = new Map<string, RepositoryProfile>();
  private indexedOnce = new Set<string>();

  constructor(private readonly engine: PolyglotIndexEngine = getIndexEngine()) {}

  async ensureIndexed(workspacePath: string, forceFull = false): Promise<IndexStats> {
    if (!forceFull && this.indexedOnce.has(workspacePath)) {
      const stats = this.engine.getStats();
      if (stats) return stats;
    }
    const stats = await this.engine.ensureIndex({ workspacePath, forceFull });
    this.indexedOnce.add(workspacePath);
    return stats;
  }

  /** Mark that indexing already happened for this workspace in the current run. */
  markIndexed(workspacePath: string): void {
    this.indexedOnce.add(workspacePath);
  }

  wasIndexed(workspacePath: string): boolean {
    return this.indexedOnce.has(workspacePath);
  }

  async getRepositoryProfile(workspacePath: string): Promise<RepositoryProfile | null> {
    return this.profiles.get(workspacePath) ?? null;
  }

  async setRepositoryProfile(workspacePath: string, profile: RepositoryProfile): Promise<void> {
    this.profiles.set(workspacePath, repositoryProfileSchema.parse(profile));
  }

  async findSymbols(workspacePath: string, query: string): Promise<SymbolMatch[]> {
    await this.ensureIndexed(workspacePath);
    const hits = await this.engine.searchBackend.findSymbols(workspacePath, query);
    const lsp = getDetectingLspAdapter();
    const adapter = getLanguageServerAdapter();
    if (lsp?.isActive() && hits[0]) {
      const fromLsp = await adapter.definitions(
        workspacePath,
        hits[0].filePath,
        hits[0].startLine,
        0,
      );
      if (fromLsp.length > 0) return preferLspHits(lsp, fromLsp);
    }
    return lsp ? preferLspHits(lsp, hits) : hits;
  }

  async findReferences(workspacePath: string, symbol: string): Promise<ReferenceMatch[]> {
    await this.ensureIndexed(workspacePath);
    const hits = await this.engine.searchBackend.findReferences(workspacePath, symbol);
    const lsp = getDetectingLspAdapter();
    const adapter = getLanguageServerAdapter();
    if (lsp?.isActive() && hits[0]) {
      const fromLsp = await adapter.references(workspacePath, hits[0].filePath, hits[0].line, 0);
      if (fromLsp.length > 0) return preferLspHits(lsp, fromLsp);
    }
    return lsp ? preferLspHits(lsp, hits) : hits;
  }

  async impactedPaths(workspacePath: string, query: string): Promise<string[]> {
    const result = await this.engine.search({ workspacePath, query });
    this.indexedOnce.add(workspacePath);
    return result.impactedPaths;
  }

  async searchCodeIntel(workspacePath: string, query: string) {
    const result = await this.engine.search({ workspacePath, query });
    this.indexedOnce.add(workspacePath);
    return result;
  }
}

let singleton: WorkspaceGraph | null = null;

export function getWorkspaceGraph(): WorkspaceGraph {
  if (!singleton) singleton = new WorkspaceGraph();
  return singleton;
}

export function resetWorkspaceGraphForTests(): void {
  singleton = new WorkspaceGraph();
}
