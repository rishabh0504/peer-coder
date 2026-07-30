/** Optional LSP: detect language servers on PATH; prefer over pure index when available. */

import { spawnSync } from "node:child_process";
import path from "node:path";
import type { LanguageServerAdapter, ReferenceMatch, SymbolMatch } from "../types.js";
import { NoopLanguageServerAdapter } from "./adapter.js";

const SERVER_BY_EXT: Record<string, string[]> = {
  ".ts": ["typescript-language-server"],
  ".tsx": ["typescript-language-server"],
  ".js": ["typescript-language-server"],
  ".jsx": ["typescript-language-server"],
  ".mts": ["typescript-language-server"],
  ".cts": ["typescript-language-server"],
  ".py": ["pyright", "pyright-langserver"],
  ".go": ["gopls"],
  ".rs": ["rust-analyzer"],
};

function which(bin: string): boolean {
  const cmd = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(cmd, [bin], { encoding: "utf8" });
  return r.status === 0;
}

export function detectLanguageServers(): string[] {
  const bins = new Set<string>();
  for (const list of Object.values(SERVER_BY_EXT)) {
    for (const b of list) bins.add(b);
  }
  return [...bins].filter(which);
}

/**
 * Detects language-server binaries on PATH.
 * Full JSON-RPC client is progressive; while no process is spawned, callers
 * use {@link preferLspHits} to elevate index/rg results for languages with a server.
 */
export class DetectingLanguageServerAdapter implements LanguageServerAdapter {
  private readonly noop = new NoopLanguageServerAdapter();
  private readonly available: Set<string>;

  constructor(available?: string[]) {
    this.available = new Set(available ?? detectLanguageServers());
  }

  hasServerForFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const candidates = SERVER_BY_EXT[ext] ?? [];
    return candidates.some((c) => this.available.has(c));
  }

  listAvailable(): string[] {
    return [...this.available];
  }

  isActive(): boolean {
    return this.available.size > 0;
  }

  async definitions(
    workspacePath: string,
    filePath: string,
    line: number,
    character: number,
  ): Promise<SymbolMatch[]> {
    // No stdio JSON-RPC client yet — defer to hybrid index path.
    if (!this.hasServerForFile(filePath)) {
      return this.noop.definitions(workspacePath, filePath, line, character);
    }
    return [];
  }

  async references(
    workspacePath: string,
    filePath: string,
    line: number,
    character: number,
  ): Promise<ReferenceMatch[]> {
    if (!this.hasServerForFile(filePath)) {
      return this.noop.references(workspacePath, filePath, line, character);
    }
    return [];
  }

  async hover(
    workspacePath: string,
    filePath: string,
    line: number,
    character: number,
  ): Promise<string | null> {
    if (!this.hasServerForFile(filePath)) {
      return this.noop.hover(workspacePath, filePath, line, character);
    }
    return `Language server available for ${path.extname(filePath)} (${[...this.available].join(", ")})`;
  }
}

/** Prefer / elevate hits for files whose language has a detected server. */
export function preferLspHits<T extends { filePath: string; confidence?: string; source?: string }>(
  adapter: DetectingLanguageServerAdapter,
  hits: T[],
): T[] {
  if (!adapter.isActive()) return hits;
  const elevated: T[] = [];
  const rest: T[] = [];
  for (const h of hits) {
    if (adapter.hasServerForFile(h.filePath)) {
      elevated.push({
        ...h,
        confidence: "high",
        ...(h.source !== undefined ? { source: "lsp" } : {}),
      } as T);
    } else {
      rest.push(h);
    }
  }
  return [...elevated, ...rest];
}

let singleton: DetectingLanguageServerAdapter | null = null;

export function getLanguageServerAdapter(): LanguageServerAdapter {
  if (process.env.PEER_CODER_LSP === "0") return new NoopLanguageServerAdapter();
  if (!singleton) singleton = new DetectingLanguageServerAdapter();
  return singleton;
}

export function getDetectingLspAdapter(): DetectingLanguageServerAdapter | null {
  if (process.env.PEER_CODER_LSP === "0") return null;
  if (!singleton) singleton = new DetectingLanguageServerAdapter();
  return singleton;
}

export { NoopLanguageServerAdapter };
