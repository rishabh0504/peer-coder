import fs from "node:fs/promises";
import path from "node:path";
import { createFileTool } from "@tools/file-system/create_file.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("create_file Tool Edge Cases", () => {
  const testDir = path.resolve(process.cwd(), "temp_create_file_test");
  const context = createDefaultWorkspaceContext(testDir);

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should create file in workspace root", async () => {
    const filePath = path.join(testDir, "root.txt");
    const result = await createFileTool.invoke(
      { path: filePath, content: "Hello World" },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.bytesWritten).toBe(11);
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("Hello World");
  });

  it("should auto-create missing nested subdirectories", async () => {
    const filePath = path.join(testDir, "nested/deep/dir/file.txt");
    await createFileTool.invoke(
      { path: filePath, content: "Nested content" },
      { configurable: { workspaceContext: context } },
    );

    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("Nested content");
  });

  it("should create empty 0-byte file when content is empty string", async () => {
    const filePath = path.join(testDir, "empty.txt");
    const result = await createFileTool.invoke(
      { path: filePath, content: "" },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.bytesWritten).toBe(0);
  });

  it("should create file with unicode / UTF-8 multi-byte characters", async () => {
    const filePath = path.join(testDir, "unicode.txt");
    await createFileTool.invoke(
      { path: filePath, content: "🚀 Enterprise Agent AI 🤖" },
      { configurable: { workspaceContext: context } },
    );

    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("🚀 Enterprise Agent AI 🤖");
  });

  it("should throw error when file exists and overwrite is false", async () => {
    const filePath = path.join(testDir, "exists.txt");
    await fs.writeFile(filePath, "Original", "utf-8");

    await expect(
      createFileTool.invoke(
        { path: filePath, content: "New", overwrite: false },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/already exists/);
  });

  it("should overwrite existing file when overwrite is true", async () => {
    const filePath = path.join(testDir, "overwrite.txt");
    await fs.writeFile(filePath, "Original", "utf-8");

    await createFileTool.invoke(
      { path: filePath, content: "Replaced", overwrite: true },
      { configurable: { workspaceContext: context } },
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("Replaced");
  });

  it("should throw security error for path breakout (../config.json)", async () => {
    await expect(
      createFileTool.invoke(
        { path: "../config.json", content: "hack" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Security Error/);
  });

  it("should throw security error for absolute path outside workspace", async () => {
    await expect(
      createFileTool.invoke(
        { path: "/etc/passwd", content: "hack" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Security Error/);
  });

  it("should validate return shape contains exactly path and bytesWritten", async () => {
    const filePath = path.join(testDir, "shape_check.txt");
    const result = await createFileTool.invoke(
      { path: filePath, content: "test" },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);
    expect(keys.length).toBe(2);
    expect(keys).toContain("path");
    expect(keys).toContain("bytesWritten");
  });

  it("should default overwrite to true when not provided", async () => {
    const filePath = path.join(testDir, "default_overwrite.txt");
    await fs.writeFile(filePath, "Original", "utf-8");

    await createFileTool.invoke(
      { path: filePath, content: "New Content" },
      { configurable: { workspaceContext: context } },
    );

    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("New Content");
  });
});
