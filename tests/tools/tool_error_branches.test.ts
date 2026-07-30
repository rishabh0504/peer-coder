import "../../src/tools/index.js";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { applyPatchTool } from "@tools/file-system/apply_patch.js";
import { createFileTool } from "@tools/file-system/create_file.js";
import { deleteFileTool } from "@tools/file-system/delete_file.js";
import { listFilesTool } from "@tools/file-system/list_files.js";
import { readFileTool } from "@tools/file-system/read_file.js";

import { executeCommandTool } from "@tools/execution/execute_command.js";
import { getCommandOutputTool } from "@tools/execution/get_command_output.js";

import { gitDiffTool } from "@tools/git/git_diff.js";
import { gitStatusTool } from "@tools/git/git_status.js";

import { findReferencesTool } from "@tools/search-indexing/find_references.js";
import { findSymbolTool } from "@tools/search-indexing/find_symbol.js";
import { searchCodeTool } from "@tools/search-indexing/search_code.js";

import { fetchWebpageTool } from "@tools/web-search/fetch_webpage.js";
import { webSearchTool } from "@tools/web-search/web_search.js";
import { workspaceInfoTool } from "@tools/workspace/workspace_info.js";

import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { describe, expect, it, vi } from "vitest";

describe("Tool Wrapper Error Throw Paths Coverage", () => {
  const context = createDefaultWorkspaceContext();

  it("should throw error when tool runtime execution returns failure", async () => {
    const runtimeSpy = vi.spyOn(defaultToolRuntime, "execute").mockResolvedValue({
      success: false,
      error: { code: "TEST_ERROR", message: "Mocked runtime failure" },
    } as any);

    const config = { configurable: { workspaceContext: context } };

    await expect(readFileTool.invoke({ path: "a.ts" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );
    await expect(createFileTool.invoke({ path: "a.ts", content: "x" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );
    await expect(
      applyPatchTool.invoke({ path: "a.ts", startLine: 1, endLine: 1, replacement: "x" }, config),
    ).rejects.toThrow("Mocked runtime failure");
    await expect(deleteFileTool.invoke({ path: "a.ts" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );
    await expect(listFilesTool.invoke({ path: "." }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );

    await expect(executeCommandTool.invoke({ command: "echo 1" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );
    await expect(getCommandOutputTool.invoke({ processId: "p1" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );

    await expect(gitStatusTool.invoke({}, config)).rejects.toThrow("Mocked runtime failure");
    await expect(gitDiffTool.invoke({}, config)).rejects.toThrow("Mocked runtime failure");

    await expect(searchCodeTool.invoke({ query: "q" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );
    await expect(findSymbolTool.invoke({ symbol: "s" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );
    await expect(findReferencesTool.invoke({ symbol: "s" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );

    await expect(webSearchTool.invoke({ query: "qq" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );
    await expect(fetchWebpageTool.invoke({ url: "https://example.com" }, config)).rejects.toThrow(
      "Mocked runtime failure",
    );
    await expect(workspaceInfoTool.invoke({}, config)).rejects.toThrow("Mocked runtime failure");

    runtimeSpy.mockRestore();
  });
});
