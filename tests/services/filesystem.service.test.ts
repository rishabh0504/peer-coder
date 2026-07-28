import fs from "node:fs/promises";
import path from "node:path";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("WorkspaceFileSystem Service", () => {
  const testDir = path.resolve(process.cwd(), "temp_test_workspace");
  const context = createDefaultWorkspaceContext(testDir);

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should create and read file with line ranges", async () => {
    const filePath = "hello.txt";
    await workspaceFileSystem.createFile(context, filePath, "Line 1\nLine 2\nLine 3");

    const readResult = await workspaceFileSystem.readFile(context, filePath, 1, 2);
    expect(readResult.totalLines).toBe(3);
    expect(readResult.content).toContain("1 | Line 1");
    expect(readResult.content).toContain("2 | Line 2");
    expect(readResult.content).not.toContain("3 | Line 3");
  });

  it("should perform deterministic line range patch", async () => {
    const filePath = "code.ts";
    await workspaceFileSystem.createFile(
      context,
      filePath,
      "const a = 1;\nconst b = 2;\nconst c = 3;",
    );

    await workspaceFileSystem.applyPatch(context, filePath, 2, 2, "const b = 20;");

    const updated = await workspaceFileSystem.readFile(context, filePath, 1, 3, false);
    expect(updated.content).toBe("const a = 1;\nconst b = 20;\nconst c = 3;");
  });

  it("should delete file safely", async () => {
    const filePath = "delete_me.txt";
    await workspaceFileSystem.createFile(context, filePath, "bye");

    const deleteRes = await workspaceFileSystem.deleteFile(context, filePath);
    expect(deleteRes.deleted).toBe(true);

    await expect(workspaceFileSystem.readFile(context, filePath)).rejects.toThrow();
  });
});
