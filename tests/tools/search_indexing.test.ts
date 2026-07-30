import { findReferencesTool } from "@tools/search-indexing/find_references.js";
import { findSymbolTool } from "@tools/search-indexing/find_symbol.js";
import { searchCodeTool } from "@tools/search-indexing/search_code.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { describe, expect, it } from "vitest";

describe("search-indexing Tools Suite", () => {
  const context = createDefaultWorkspaceContext();

  it("should search code using search_code tool (STUB behavior)", async () => {
    // STUB: replace with real grep test when implemented
    const result = await searchCodeTool.invoke(
      { query: "ToolRuntime" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.query).toBe("ToolRuntime");
    expect(parsed.matches).toEqual([]);
  });

  it("should validate search_code shape", async () => {
    const result = await searchCodeTool.invoke(
      { query: "test" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("query");
    expect(parsed).toHaveProperty("matches");
    expect(Array.isArray(parsed.matches)).toBe(true);
  });

  it("should throw validation error when search_code query is empty", async () => {
    await expect(
      searchCodeTool.invoke({ query: "" }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow();
  });

  it("should execute find_symbol tool (STUB behavior)", async () => {
    // STUB: replace with real AST test when implemented
    const result = await findSymbolTool.invoke(
      { symbol: "WorkspaceGuard" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.symbol).toBe("WorkspaceGuard");
    expect(parsed.matches).toEqual([]);
  });

  it("should validate find_symbol shape", async () => {
    const result = await findSymbolTool.invoke(
      { symbol: "test" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("symbol");
    expect(parsed).toHaveProperty("matches");
    expect(Array.isArray(parsed.matches)).toBe(true);
  });

  it("should throw validation error when find_symbol symbol is empty", async () => {
    await expect(
      findSymbolTool.invoke({ symbol: "" }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow();
  });

  it("should execute find_references tool (STUB behavior)", async () => {
    // STUB: replace with real references scanner test when implemented
    const result = await findReferencesTool.invoke(
      { symbol: "PolicyEngine" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.symbol).toBe("PolicyEngine");
    expect(parsed.references).toEqual([]);
  });

  it("should validate find_references shape", async () => {
    const result = await findReferencesTool.invoke(
      { symbol: "test" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("symbol");
    expect(parsed).toHaveProperty("references");
    expect(Array.isArray(parsed.references)).toBe(true);
  });

  it("should throw validation error when find_references symbol is empty", async () => {
    await expect(
      findReferencesTool.invoke({ symbol: "" }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow();
  });
});
