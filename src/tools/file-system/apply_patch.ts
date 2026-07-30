import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/context/workspace_context.js";
import { z } from "zod";

export const applyPatchInputSchema = z.object({
  path: z.string().describe("Relative or absolute path to the file being patched"),
  startLine: z.number().int().min(1).describe("1-indexed starting line range"),
  endLine: z.number().int().min(1).describe("1-indexed ending line range"),
  replacement: z.string().describe("Replacement line(s) content"),
});

export const applyPatchTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "apply_patch",
      input,
      async (context, args) => {
        return await workspaceFileSystem.applyPatch(
          context,
          args.path,
          args.startLine,
          args.endLine,
          args.replacement,
        );
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to apply patch.",
        "apply_patch",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "apply_patch",
    description: "Apply surgical line-range replacement patch to target file.",
    schema: applyPatchInputSchema,
  },
);
