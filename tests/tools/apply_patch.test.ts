import fs from "node:fs/promises";
import path from "node:path";
import { applyPatchTool } from "@tools/file-system/apply_patch.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("apply_patch Tool Edge Cases", () => {
  const testDir = path.resolve(process.cwd(), "temp_patch_file_test");
  const context = createDefaultWorkspaceContext(testDir);

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should replace single line in middle of file", async () => {
    const filePath = path.join(testDir, "middle.ts");
    await fs.writeFile(filePath, "const a = 1;\nconst b = 2;\nconst c = 3;", "utf-8");

    await applyPatchTool.invoke(
      { path: filePath, startLine: 2, endLine: 2, replacement: "const b = 20;" },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("const a = 1;\nconst b = 20;\nconst c = 3;");
  });

  it("should replace line 1 (first line of file)", async () => {
    const filePath = path.join(testDir, "first.ts");
    await fs.writeFile(filePath, "const a = 1;\nconst b = 2;", "utf-8");

    await applyPatchTool.invoke(
      { path: filePath, startLine: 1, endLine: 1, replacement: "const a = 100;" },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("const a = 100;\nconst b = 2;");
  });

  it("should replace last line of file (endLine=totalLines)", async () => {
    const filePath = path.join(testDir, "last.ts");
    await fs.writeFile(filePath, "const a = 1;\nconst b = 2;", "utf-8");

    await applyPatchTool.invoke(
      { path: filePath, startLine: 2, endLine: 2, replacement: "const b = 200;" },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("const a = 1;\nconst b = 200;");
  });

  it("should replace entire file content (startLine=1, endLine=totalLines)", async () => {
    const filePath = path.join(testDir, "entire.ts");
    await fs.writeFile(filePath, "line 1\nline 2", "utf-8");

    await applyPatchTool.invoke(
      { path: filePath, startLine: 1, endLine: 2, replacement: "new content" },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("new content");
  });

  it("should replace 1 line with multiple lines (expansion patch)", async () => {
    const filePath = path.join(testDir, "expand.ts");
    await fs.writeFile(filePath, "const x = 1;\nconst y = 2;", "utf-8");

    await applyPatchTool.invoke(
      { path: filePath, startLine: 1, endLine: 1, replacement: "const x1 = 1;\nconst x2 = 1.5;" },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("const x1 = 1;\nconst x2 = 1.5;\nconst y = 2;");
  });

  it("should replace multiple lines with 1 line (compression patch)", async () => {
    const filePath = path.join(testDir, "compress.ts");
    await fs.writeFile(filePath, "line 1\nline 2\nline 3", "utf-8");

    await applyPatchTool.invoke(
      { path: filePath, startLine: 1, endLine: 2, replacement: "compressed line" },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("compressed line\nline 3");
  });

  it("should throw error when startLine < 1", async () => {
    const filePath = path.join(testDir, "bounds.ts");
    await fs.writeFile(filePath, "line 1", "utf-8");

    await expect(
      applyPatchTool.invoke(
        { path: filePath, startLine: 0, endLine: 1, replacement: "err" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Number must be greater than or equal to 1/);
  });

  it("should throw error when endLine < startLine", async () => {
    const filePath = path.join(testDir, "bounds2.ts");
    await fs.writeFile(filePath, "line 1\nline 2", "utf-8");

    await expect(
      applyPatchTool.invoke(
        { path: filePath, startLine: 2, endLine: 1, replacement: "err" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Invalid endLine/);
  });

  it("should throw security error for path breakout (../index.ts)", async () => {
    await expect(
      applyPatchTool.invoke(
        { path: "../index.ts", startLine: 1, endLine: 1, replacement: "err" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Security Error/);
  });

  it("should support line deletion by replacing with empty string", async () => {
    const filePath = path.join(testDir, "delete_line.ts");
    await fs.writeFile(filePath, "line 1\nline 2\nline 3", "utf-8");

    await applyPatchTool.invoke(
      { path: filePath, startLine: 2, endLine: 2, replacement: "" },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("line 1\n\nline 3");
  });

  it("should return JSON with path and linesReplaced", async () => {
    const filePath = path.join(testDir, "shape_check.ts");
    await fs.writeFile(filePath, "line 1\nline 2", "utf-8");

    const result = await applyPatchTool.invoke(
      { path: filePath, startLine: 1, endLine: 2, replacement: "new" },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    expect(parsed.path).toBe(filePath);
    expect(parsed.linesReplaced).toBe(2);
  });

  it("should patch single-line file with startLine=endLine=1", async () => {
    const filePath = path.join(testDir, "single_line.ts");
    await fs.writeFile(filePath, "sole line", "utf-8");

    await applyPatchTool.invoke(
      { path: filePath, startLine: 1, endLine: 1, replacement: "updated sole line" },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("updated sole line");
  });

  it("should throw error when endLine is beyond total lines", async () => {
    const filePath = path.join(testDir, "beyond_bounds.ts");
    await fs.writeFile(filePath, "line 1\nline 2", "utf-8");

    await expect(
      applyPatchTool.invoke(
        { path: filePath, startLine: 1, endLine: 999, replacement: "new" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Invalid endLine/);
  });

  it("should throw error when file does not exist", async () => {
    const filePath = path.join(testDir, "non_existent.ts");
    await expect(
      applyPatchTool.invoke(
        { path: filePath, startLine: 1, endLine: 1, replacement: "new" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow();
  });
});
