import fs from "node:fs/promises";
import path from "node:path";
import { listFilesTool } from "@tools/file-system/list_files.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("list_files Tool Edge Cases", () => {
  const workspaceRoot = process.cwd();
  const testDir = path.resolve(workspaceRoot, "temp_list_files_test");
  const context = createDefaultWorkspaceContext(workspaceRoot);

  beforeEach(async () => {
    await fs.mkdir(path.join(testDir, "sub1/sub2"), { recursive: true });
    await fs.writeFile(path.join(testDir, "a.ts"), "hello", "utf-8");
    await fs.writeFile(path.join(testDir, "b.js"), "world", "utf-8");
    await fs.writeFile(path.join(testDir, "sub1/c.ts"), "sub", "utf-8");
    await fs.writeFile(path.join(testDir, "sub1/sub2/d.json"), "deep", "utf-8");
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should list top-level files in workspace directory when recursive=false", async () => {
    const result = await listFilesTool.invoke(
      { path: testDir, recursive: false },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    const relA = path.join("temp_list_files_test", "a.ts");
    const relB = path.join("temp_list_files_test", "b.js");
    const relSub = path.join("temp_list_files_test", "sub1/c.ts");

    expect(parsed.files).toContain(relA);
    expect(parsed.files).toContain(relB);
    expect(parsed.files).not.toContain(relSub);
  });

  it("should list files recursively when recursive=true", async () => {
    const result = await listFilesTool.invoke(
      { path: testDir, recursive: true },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    const relA = path.join("temp_list_files_test", "a.ts");
    const relSub = path.join("temp_list_files_test", "sub1/c.ts");
    const relSub2 = path.join("temp_list_files_test", "sub1/sub2/d.json");

    expect(parsed.files).toContain(relA);
    expect(parsed.files).toContain(relSub);
    expect(parsed.files).toContain(relSub2);
  });

  it("should respect maxDepth limit during recursive search", async () => {
    const result = await listFilesTool.invoke(
      { path: testDir, recursive: true, maxDepth: 1 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    const relA = path.join("temp_list_files_test", "a.ts");
    const relSub2 = path.join("temp_list_files_test", "sub1/sub2/d.json");

    expect(parsed.files).toContain(relA);
    expect(parsed.files).not.toContain(relSub2);
  });

  it("should cap output list at maxResults limit", async () => {
    const result = await listFilesTool.invoke(
      { path: testDir, recursive: true, maxResults: 2 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.files.length).toBeLessThanOrEqual(2);
  });

  it("should filter files matching extensions filter", async () => {
    const result = await listFilesTool.invoke(
      { path: testDir, recursive: true, extensions: [".ts"] },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    const relA = path.join("temp_list_files_test", "a.ts");
    const relSub = path.join("temp_list_files_test", "sub1/c.ts");
    const relB = path.join("temp_list_files_test", "b.js");

    expect(parsed.files).toContain(relA);
    expect(parsed.files).toContain(relSub);
    expect(parsed.files).not.toContain(relB);
  });

  it("should filter extensions without leading dot", async () => {
    const result = await listFilesTool.invoke(
      { path: testDir, recursive: true, extensions: ["js"] },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    const relA = path.join("temp_list_files_test", "a.ts");
    const relB = path.join("temp_list_files_test", "b.js");

    expect(parsed.files).toContain(relB);
    expect(parsed.files).not.toContain(relA);
  });

  it("should return single file path if target path is a file", async () => {
    const filePath = path.join(testDir, "a.ts");
    const result = await listFilesTool.invoke(
      { path: filePath },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(result);

    expect(parsed.files).toHaveLength(1);
  });

  it("should throw security error for directory path breakout", async () => {
    await expect(
      listFilesTool.invoke({ path: "../.." }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow();
  });
});
