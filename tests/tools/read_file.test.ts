import fs from "node:fs/promises";
import path from "node:path";
import { readFileTool } from "@tools/file-system/read_file.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("read_file Tool Edge Cases", () => {
  const testDir = path.resolve(process.cwd(), "temp_read_file_test");
  const context = createDefaultWorkspaceContext(testDir);

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should read full file when no line parameters are provided", async () => {
    const filePath = path.join(testDir, "full.txt");
    await fs.writeFile(filePath, "Line 1\nLine 2\nLine 3", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.content).toContain("1 | Line 1");
    expect(parsed.content).toContain("3 | Line 3");
  });

  it("should read specific line range (startLine=2, endLine=3)", async () => {
    const filePath = path.join(testDir, "range.txt");
    await fs.writeFile(filePath, "Line 1\nLine 2\nLine 3\nLine 4", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath, startLine: 2, endLine: 3 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.content).not.toContain("1 | Line 1");
    expect(parsed.content).toContain("2 | Line 2");
    expect(parsed.content).toContain("3 | Line 3");
  });

  it("should handle single-line slice (startLine=3, endLine=3)", async () => {
    const filePath = path.join(testDir, "single.txt");
    await fs.writeFile(filePath, "Line 1\nLine 2\nLine 3", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath, startLine: 3, endLine: 3 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.content).toBe("3 | Line 3");
  });

  it("should format raw string without line numbers when includeLineNumbers=false", async () => {
    const filePath = path.join(testDir, "raw.txt");
    await fs.writeFile(filePath, "Alpha\nBeta", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath, includeLineNumbers: false },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.content).toBe("Alpha\nBeta");
  });

  it("should clamp startLine to totalLines and not throw when startLine exceeds totalLines", async () => {
    const filePath = path.join(testDir, "bounds.txt");
    await fs.writeFile(filePath, "Line 1\nLine 2", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath, startLine: 10, endLine: 20 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    expect(parsed.content).toBe("2 | Line 2");
  });

  it("should swap startLine and endLine if startLine > endLine", async () => {
    const filePath = path.join(testDir, "swap.txt");
    await fs.writeFile(filePath, "Line 1\nLine 2\nLine 3", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath, startLine: 3, endLine: 1 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    expect(parsed.content).toContain("1 | Line 1");
    expect(parsed.content).toContain("3 | Line 3");
  });

  it("should handle empty file gracefully", async () => {
    const filePath = path.join(testDir, "empty.txt");
    await fs.writeFile(filePath, "", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    expect(parsed.content).toBe("1 | ");
  });

  it("should throw error when reading directory", async () => {
    const dirPath = path.join(testDir, "subdir");
    await fs.mkdir(dirPath);

    await expect(
      readFileTool.invoke({ path: dirPath }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow(/is a directory/);
  });

  it("should throw error when reading non-existent file path", async () => {
    const filePath = path.join(testDir, "missing.txt");
    await expect(
      readFileTool.invoke({ path: filePath }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow(/does not exist/);
  });

  it("should throw security error for relative path breakout (../secret.env)", async () => {
    await expect(
      readFileTool.invoke(
        { path: "../secret.env" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Security Error/);
  });

  it("should read last line only", async () => {
    const filePath = path.join(testDir, "last_line.txt");
    await fs.writeFile(filePath, "Line 1\nLine 2\nLine 3\nLine 4\nLine 5", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath, startLine: 5, endLine: 5 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    expect(parsed.content).toBe("5 | Line 5");
  });

  it("should return JSON with exactly two keys: path and content", async () => {
    const filePath = path.join(testDir, "shape.txt");
    await fs.writeFile(filePath, "test content", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);
    expect(keys.length).toBe(2);
    expect(keys).toContain("path");
    expect(keys).toContain("content");
  });

  it("should read startLine = 1, endLine = total lines", async () => {
    const filePath = path.join(testDir, "exact_bounds.txt");
    await fs.writeFile(filePath, "A\nB\nC", "utf-8");

    const result = await readFileTool.invoke(
      { path: filePath, startLine: 1, endLine: 3 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    expect(parsed.content).toBe("1 | A\n2 | B\n3 | C");
  });

  it("should throw validation error when startLine = 0", async () => {
    const filePath = path.join(testDir, "invalid_start.txt");
    await fs.writeFile(filePath, "A\nB", "utf-8");

    await expect(
      readFileTool.invoke(
        { path: filePath, startLine: 0, endLine: 2 },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow();
  });

  it("should throw security error for absolute path outside workspace", async () => {
    await expect(
      readFileTool.invoke({ path: "/etc/hosts" }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow(/Security Error/);
  });
});
