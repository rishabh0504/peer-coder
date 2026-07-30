import path from "node:path";
import { describe, expect, it } from "vitest";
import { PolyglotIndexEngine, getIndexEngine } from "../../src/code_intel/index/engine.js";
import { createDefaultIndexer } from "../../src/code_intel/indexer/index.js";
import { NoopLanguageServerAdapter } from "../../src/code_intel/lsp/adapter.js";
import { walkRepo } from "../../src/code_intel/walk/repo_walker.js";

const fixtures = path.resolve(__dirname, "../fixtures/polyglot");

describe("polyglot code intel", () => {
  it("indexes Python-only fixture without any TypeScript", async () => {
    const root = path.join(fixtures, "python");
    const engine = new PolyglotIndexEngine();
    const result = await engine.search({ workspacePath: root, query: "PaymentService" });
    expect(result.symbols.some((s) => s.name === "PaymentService")).toBe(true);
    expect(result.files.every((f) => !f.path.endsWith(".ts"))).toBe(true);
    expect(result.stats.byLanguage.python ?? 0).toBeGreaterThan(0);
  });

  it("indexes Go-only fixture", async () => {
    const root = path.join(fixtures, "go");
    const engine = new PolyglotIndexEngine();
    const result = await engine.search({ workspacePath: root, query: "PaymentService" });
    expect(
      result.symbols.some((s) => s.name === "PaymentService" || s.name === "CreateClient"),
    ).toBe(true);
  });

  it("indexes Rust / Java / C++ fixtures", async () => {
    for (const lang of ["rust", "java", "cpp"] as const) {
      const root = path.join(fixtures, lang);
      const engine = new PolyglotIndexEngine();
      const result = await engine.search({ workspacePath: root, query: "PaymentService" });
      expect(
        result.symbols.some((s) => s.name.includes("Payment") || s.name.includes("charge")),
        `expected symbols in ${lang}`,
      ).toBe(true);
    }
  });

  it("still indexes TypeScript PaymentService", async () => {
    const root = path.join(fixtures, "typescript");
    const result = await createDefaultIndexer().index({
      workspacePath: root,
      query: "PaymentService",
    });
    expect(result.symbols.some((s) => s.name === "PaymentService")).toBe(true);
  });

  it("warm incremental path skips unchanged files", async () => {
    const root = path.join(fixtures, "python");
    const engine = new PolyglotIndexEngine();
    const first = await engine.ensureIndex({ workspacePath: root, forceFull: true });
    expect(first.mode).toBe("full");
    const second = await engine.ensureIndex({ workspacePath: root });
    expect(second.mode).toBe("incremental");
    expect(second.filesUnchanged).toBeGreaterThan(0);
  });

  it("repo walker respects size and skips node_modules-like dirs", async () => {
    const walked = await walkRepo({
      workspacePath: path.resolve(__dirname, "../.."),
      maxFiles: 50,
    });
    expect(walked.files.every((f) => !f.relativePath.includes("node_modules"))).toBe(true);
  });

  it("hybrid search returns references via ripgrep/fallback", async () => {
    const root = path.join(fixtures, "typescript");
    const engine = getIndexEngine();
    await engine.ensureIndex({ workspacePath: root, forceFull: true });
    const refs = await engine.searchBackend.findReferences(root, "PaymentService");
    expect(refs.length).toBeGreaterThan(0);
  });

  it("LSP seam noop adapter returns empty", async () => {
    const lsp = new NoopLanguageServerAdapter();
    expect(await lsp.definitions("/x", "a.ts", 1, 1)).toEqual([]);
    expect(await lsp.hover("/x", "a.ts", 1, 1)).toBeNull();
  });

  it("regex fallback env degrades to generic parser without crashing", async () => {
    const prev = process.env.PEER_CODER_CODE_INTEL_FALLBACK;
    process.env.PEER_CODER_CODE_INTEL_FALLBACK = "regex";
    try {
      const root = path.join(fixtures, "python");
      const engine = new PolyglotIndexEngine();
      const result = await engine.search({ workspacePath: root, query: "PaymentService" });
      expect(result.symbols.some((s) => s.name === "PaymentService")).toBe(true);
      expect(result.symbols.every((s) => s.confidence === "low" || s.parser === "generic")).toBe(
        true,
      );
    } finally {
      if (prev === undefined) process.env.PEER_CODER_CODE_INTEL_FALLBACK = undefined;
      else process.env.PEER_CODER_CODE_INTEL_FALLBACK = prev;
    }
  });
});
