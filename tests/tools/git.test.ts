import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gitDiffTool } from "@tools/git/git_diff.js";
import { gitStatusTool } from "@tools/git/git_status.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { describe, expect, it } from "vitest";

describe("git Tools Suite", () => {
  const context = createDefaultWorkspaceContext();

  it("should validate git_status shape", async () => {
    const result = await gitStatusTool.invoke({}, { configurable: { workspaceContext: context } });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("status");
    expect(typeof parsed.status).toBe("string");
  });

  it("should validate git_diff shape", async () => {
    const result = await gitDiffTool.invoke({}, { configurable: { workspaceContext: context } });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("diff");
    expect(typeof parsed.diff).toBe("string");
  });

  it("should detect modified/added files in git_status and git_diff", async () => {
    // Write a temporary file in the workspace root
    const tempFile = path.join(context.workspaceRoot, "git_test_temp_file.txt");
    await fs.writeFile(tempFile, "initial content", "utf-8");

    try {
      // 1. Check status
      const statusRes = await gitStatusTool.invoke(
        {},
        { configurable: { workspaceContext: context } },
      );
      const parsedStatus = JSON.parse(statusRes);
      expect(parsedStatus.status).toContain("git_test_temp_file.txt");

      // 2. Check diff with path
      const diffRes = await gitDiffTool.invoke(
        { path: "git_test_temp_file.txt" },
        { configurable: { workspaceContext: context } },
      );
      const parsedDiff = JSON.parse(diffRes);
      expect(parsedDiff.diff).toBeDefined();
    } finally {
      await fs.unlink(tempFile);
    }
  });

  it("should throw error when running in a non-git directory", async () => {
    const nonGitDir = path.join(os.tmpdir(), `non_git_dir_${Date.now()}`);
    await fs.mkdir(nonGitDir, { recursive: true });

    const nonGitContext = createDefaultWorkspaceContext(nonGitDir);

    try {
      await expect(
        gitStatusTool.invoke({}, { configurable: { workspaceContext: nonGitContext } }),
      ).rejects.toThrow();

      await expect(
        gitDiffTool.invoke({}, { configurable: { workspaceContext: nonGitContext } }),
      ).rejects.toThrow();
    } finally {
      await fs.rm(nonGitDir, { recursive: true, force: true });
    }
  });
});
