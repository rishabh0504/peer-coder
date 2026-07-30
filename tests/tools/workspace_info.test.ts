import { workspaceInfoTool } from "@tools/workspace/workspace_info.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { describe, expect, it } from "vitest";

describe("Workspace Info Tool Suite", () => {
  const context = createDefaultWorkspaceContext();

  it("should execute workspace_info tool and return context metadata with correct shape", async () => {
    const result = await workspaceInfoTool.invoke(
      {},
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.workspaceRoot).toBe(context.workspaceRoot);
    expect(parsed.permissions).toBeDefined();
    expect(parsed).toHaveProperty("workspaceRoot");
    expect(parsed).toHaveProperty("permissions");
    expect(parsed).toHaveProperty("maxFileSizeByte");
  });
});
