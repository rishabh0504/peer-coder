import { findReferencesTool } from "@tools/search-indexing/find_references.js";
import { findSymbolTool } from "@tools/search-indexing/find_symbol.js";
import { searchCodeTool } from "@tools/search-indexing/search_code.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { describe, expect, it } from "vitest";

describe("search-indexing Tools Suite", () => {
  const context = createDefaultWorkspaceContext();

  it("should search code using search_code tool", async () => {
    const result = await searchCodeTool.invoke(
      { query: "ToolRuntime" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.query).toBe("ToolRuntime");
    expect(parsed.matches).toBeDefined();
  });

  it("should execute find_symbol tool", async () => {
    const result = await findSymbolTool.invoke(
      { symbol: "WorkspaceGuard" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.symbol).toBe("WorkspaceGuard");
  });

  it("should execute find_references tool", async () => {
    const result = await findReferencesTool.invoke(
      { symbol: "PolicyEngine" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.symbol).toBe("PolicyEngine");
  });
});
