import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/context/workspace_context.js";
import { z } from "zod";

export const deleteFileInputSchema = z.object({
  path: z.string().describe("Relative or absolute path to target file"),
});

export const deleteFileTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "delete_file",
      input,
      async (context, args) => {
        return await workspaceFileSystem.deleteFile(context, args.path);
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to delete file.",
        "delete_file",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "delete_file",
    description: "Delete target file safely from workspace.",
    schema: deleteFileInputSchema,
  },
);
