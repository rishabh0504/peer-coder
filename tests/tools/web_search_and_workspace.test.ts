import { webSearchTool } from "@tools/web-search/web_search.js";
import { workspaceInfoTool } from "@tools/workspace/workspace_info.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { describe, expect, it } from "vitest";

describe("web-search & workspace Tools Suite", () => {
  const context = createDefaultWorkspaceContext();

  it("should execute web_search tool", async () => {
    const result = await webSearchTool.invoke(
      { query: "TypeScript LLM Agents" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.query).toBe("TypeScript LLM Agents");
  });

  it("should execute workspace_info tool and return context metadata", async () => {
    const result = await workspaceInfoTool.invoke(
      {},
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.workspaceRoot).toBe(context.workspaceRoot);
    expect(parsed.permissions).toBeDefined();
  });
});
