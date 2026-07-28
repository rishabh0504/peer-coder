import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { z } from "zod";

export const createFileInputSchema = z.object({
  path: z.string().describe("Relative or absolute path to the target file"),
  content: z.string().describe("Text content to write to the file"),
  overwrite: z.boolean().default(true).describe("Whether to overwrite file if it exists"),
});

export const createFileTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "create_file",
      input,
      async (context, args) => {
        return await workspaceFileSystem.createFile(
          context,
          args.path,
          args.content,
          args.overwrite,
        );
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to create file.",
        "create_file",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "create_file",
    description: "Create a new file or overwrite existing file in workspace root.",
    schema: createFileInputSchema,
  },
);
