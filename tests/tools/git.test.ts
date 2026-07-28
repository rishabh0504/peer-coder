import { gitDiffTool } from "@tools/git/git_diff.js";
import { gitStatusTool } from "@tools/git/git_status.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { describe, expect, it } from "vitest";

describe("git Tools Suite", () => {
  const context = createDefaultWorkspaceContext();

  it("should execute git_status tool successfully", async () => {
    const result = await gitStatusTool.invoke({}, { configurable: { workspaceContext: context } });

    const parsed = JSON.parse(result);
    expect(parsed.status).toBeDefined();
  });

  it("should execute git_diff tool successfully", async () => {
    const result = await gitDiffTool.invoke({}, { configurable: { workspaceContext: context } });

    const parsed = JSON.parse(result);
    expect(parsed.diff).toBeDefined();
  });
});
