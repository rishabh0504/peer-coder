import { spawn } from "node:child_process";
import type { ReferenceMatch } from "../types.js";
import { walkRepo } from "../walk/repo_walker.js";

export interface RipgrepHit {
  filePath: string;
  line: number;
  excerpt: string;
}

/**
 * Prefer system `rg`; fall back to Node walk + line scan.
 */
export async function ripgrepSearch(
  workspacePath: string,
  pattern: string,
  options?: { maxHits?: number; signal?: AbortSignal },
): Promise<RipgrepHit[]> {
  const maxHits = options?.maxHits ?? 100;
  const rgHits = await tryRg(workspacePath, pattern, maxHits, options?.signal);
  if (rgHits) return rgHits;
  return nodeFallbackSearch(workspacePath, pattern, maxHits, options?.signal);
}

async function tryRg(
  workspacePath: string,
  pattern: string,
  maxHits: number,
  signal?: AbortSignal,
): Promise<RipgrepHit[] | null> {
  return new Promise((resolve) => {
    const child = spawn("rg", ["-n", "--no-heading", "--color", "never", "-w", pattern, "."], {
      cwd: workspacePath,
      shell: false,
    });
    let out = "";
    child.stdout?.on("data", (b: Buffer) => {
      out += b.toString("utf8");
    });
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort);
    child.on("error", () => {
      signal?.removeEventListener("abort", onAbort);
      resolve(null);
    });
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (code !== 0 && code !== 1) {
        resolve(null);
        return;
      }
      const hits: RipgrepHit[] = [];
      for (const line of out.split("\n")) {
        if (!line.trim()) continue;
        const m = /^([^:]+):(\d+):(.*)$/.exec(line);
        if (!m?.[1]) continue;
        hits.push({
          filePath: m[1].replace(/^\.\//, ""),
          line: Number(m[2]),
          excerpt: (m[3] ?? "").trim().slice(0, 200),
        });
        if (hits.length >= maxHits) break;
      }
      resolve(hits);
    });
  });
}

async function nodeFallbackSearch(
  workspacePath: string,
  pattern: string,
  maxHits: number,
  signal?: AbortSignal,
): Promise<RipgrepHit[]> {
  const walked = await walkRepo({ workspacePath, maxFiles: 5000, signal });
  const re = new RegExp(`\\b${escapeRegExp(pattern)}\\b`);
  const hits: RipgrepHit[] = [];
  for (const f of walked.files) {
    const lines = f.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (re.test(line)) {
        hits.push({
          filePath: f.relativePath,
          line: i + 1,
          excerpt: line.trim().slice(0, 200),
        });
        if (hits.length >= maxHits) return hits;
      }
    }
  }
  return hits;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ripgrepHitsToReferences(symbol: string, hits: RipgrepHit[]): ReferenceMatch[] {
  return hits.map((h) => ({
    symbol,
    filePath: h.filePath,
    line: h.line,
    excerpt: h.excerpt,
    confidence: "medium" as const,
    source: "ripgrep" as const,
  }));
}
