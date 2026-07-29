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

  it("should return valid JSON from executeToolCall output", async () => {
    const result = await executeToolCall({
      name: "workspace_info",
      args: {},
    });

    expect(() => JSON.parse(result.output)).not.toThrow();
  });

  it("should handle unregistered tool call gracefully", async () => {
    const result = await executeToolCall({
      name: "non_existent_tool",
      args: {},
    });

    expect(result.output).toContain("is not registered");
  });

  it("should handle empty tool name gracefully", async () => {
    const result = await executeToolCall({
      name: "",
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

  it("should cover path printing and JSON content extraction branch", async () => {
    const { toolsMap } = await import("../../src/tools/registry.js");
    const readFileTool = toolsMap.get("read_file");

    if (readFileTool) {
      const invokeSpy = vi
        .spyOn(readFileTool, "invoke")
        .mockResolvedValue(JSON.stringify({ content: "mocked file content" }));
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await executeToolCall({
        name: "read_file",
        args: { path: "temp_file_for_test.txt" },
      });

      expect(result.output).toContain("mocked file content");
      invokeSpy.mockRestore();
      consoleSpy.mockRestore();
    }
  });

  it("should cover raw text output that fails JSON parsing", async () => {
    const { toolsMap } = await import("../../src/tools/registry.js");
    const infoTool = toolsMap.get("workspace_info");

    if (infoTool) {
      const invokeSpy = vi.spyOn(infoTool, "invoke").mockResolvedValue("Plain raw string output");
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await executeToolCall({
        name: "workspace_info",
        args: {},
      });

      expect(result.output).toBe("Plain raw string output");
      invokeSpy.mockRestore();
      consoleSpy.mockRestore();
    }
  });
});
