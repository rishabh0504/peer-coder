import fs from "node:fs/promises";
import path from "node:path";
import { deleteFileTool } from "@tools/file-system/delete_file.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("delete_file Tool Edge Cases", () => {
  const testDir = path.resolve(process.cwd(), "temp_delete_file_test");
  const context = createDefaultWorkspaceContext(testDir);

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should delete existing file and return deleted: true", async () => {
    const filePath = path.join(testDir, "remove.txt");
    await fs.writeFile(filePath, "delete me", "utf-8");

    const result = await deleteFileTool.invoke(
      { path: filePath },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.deleted).toBe(true);
    await expect(fs.stat(filePath)).rejects.toThrow();
  });

  it("should throw error when deleting non-existent file", async () => {
    const filePath = path.join(testDir, "missing.txt");
    await expect(
      deleteFileTool.invoke({ path: filePath }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow();
  });

  it("should throw security error for path breakout (../secret.key)", async () => {
    await expect(
      deleteFileTool.invoke(
        { path: "../secret.key" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Security Error/);
  });

  it("should throw security error for absolute path outside workspace", async () => {
    await expect(
      deleteFileTool.invoke(
        { path: "/etc/passwd" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Security Error/);
  });

  it("should validate shape contains path and deleted", async () => {
    const filePath = path.join(testDir, "shape_check.txt");
    await fs.writeFile(filePath, "temp", "utf-8");

    const result = await deleteFileTool.invoke(
      { path: filePath },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    expect(parsed.path).toBe(filePath);
    expect(parsed.deleted).toBe(true);
  });

  it("should throw error when path is a directory", async () => {
    const dirPath = path.join(testDir, "some_dir");
    await fs.mkdir(dirPath);

    await expect(
      deleteFileTool.invoke({ path: dirPath }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow();
  });
});
