import { executeToolCall } from "@tools/executor.js";
import { fileSystemTools } from "@tools/file-system/index.js";
import { gitTools } from "@tools/git/index.js";
import { searchIndexingTools } from "@tools/search-indexing/index.js";
import { webSearchTools } from "@tools/web-search/index.js";
import { workspaceTools } from "@tools/workspace/index.js";
import { describe, expect, it, vi } from "vitest";

describe("src/tools Execution & Index Export Coverage", () => {
  it("should verify domain index tool exports", () => {
    expect(fileSystemTools.length).toBeGreaterThan(0);
    expect(gitTools.length).toBeGreaterThan(0);
    expect(searchIndexingTools.length).toBeGreaterThan(0);
    expect(webSearchTools.length).toBeGreaterThan(0);
    expect(workspaceTools.length).toBeGreaterThan(0);
  });

  it("should execute valid registered tool via executeToolCall", async () => {
    const result = await executeToolCall({
      name: "workspace_info",
      args: {},
    });

    expect(result.output).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it("should handle unregistered tool call gracefully", async () => {
    const result = await executeToolCall({
      name: "non_existent_tool",
      args: {},
    });

    expect(result.output).toContain("is not registered");
  });

  it("should handle tool execution error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await executeToolCall({
      name: "read_file",
      args: { path: "non_existent_file_xyz.txt" },
    });

    expect(result.output).toBeDefined();
    consoleSpy.mockRestore();
  });
});
