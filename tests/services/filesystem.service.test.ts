import fs from "node:fs/promises";
import path from "node:path";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("should throw error when reading non-existent file", async () => {
    const filePath = "non_existent.txt";
    const guardModule = await import("../../src/workspace/context/workspace_guard.js");
    const safetySpy = vi.spyOn(guardModule, "validateFileReadSafety").mockResolvedValue();

    await expect(workspaceFileSystem.readFile(context, filePath)).rejects.toThrow(
      "File does not exist or is not readable:",
    );

    safetySpy.mockRestore();
  });

  it("should throw error when path is a directory", async () => {
    const dirPath = "some_sub_dir";
    await fs.mkdir(path.resolve(testDir, dirPath), { recursive: true });

    const guardModule = await import("../../src/workspace/context/workspace_guard.js");
    const safetySpy = vi.spyOn(guardModule, "validateFileReadSafety").mockResolvedValue();

    await expect(workspaceFileSystem.readFile(context, dirPath)).rejects.toThrow(
      "is a directory, not a file.",
    );

    safetySpy.mockRestore();
  });

  it("should throw error when fs.readFile fails", async () => {
    const filePath = "failed_read.txt";
    await workspaceFileSystem.createFile(context, filePath, "test content");

    const fsSpy = vi.spyOn(fs, "readFile").mockRejectedValue(new Error("Disk error"));

    await expect(workspaceFileSystem.readFile(context, filePath)).rejects.toThrow(
      "Failed to read file: Disk error",
    );

    fsSpy.mockRestore();
  });

  it("should throw error when startLine is out of bounds in applyPatch", async () => {
    const filePath = "patch_bounds.txt";
    await workspaceFileSystem.createFile(context, filePath, "line 1\nline 2");

    await expect(
      workspaceFileSystem.applyPatch(context, filePath, 0, 2, "new content"),
    ).rejects.toThrow("Invalid startLine 0");

    await expect(
      workspaceFileSystem.applyPatch(context, filePath, 3, 2, "new content"),
    ).rejects.toThrow("Invalid startLine 3");
  });
});
