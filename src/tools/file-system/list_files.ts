import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/context/workspace_context.js";
import { z } from "zod";

export const listFilesInputSchema = z.object({
  path: z.string().optional().describe("Relative path to target directory"),
  recursive: z.boolean().optional().describe("List directory subtrees recursively"),
  maxDepth: z.number().int().positive().optional().describe("Maximum directory traversal depth"),
  maxResults: z.number().int().positive().optional().describe("Maximum result count limit"),
  extensions: z.array(z.string()).optional().describe("File extension filters"),
  globPattern: z.string().optional().describe("Glob pattern filter (e.g. **/*.ts)"),
});

export const listFilesTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "list_files",
      input,
      async (context, args) => {
        return await workspaceFileSystem.listFiles(context, {
          path: args.path,
          recursive: args.recursive,
          maxDepth: args.maxDepth,
          maxResults: args.maxResults,
          extensions: args.extensions,
        });
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to list files.",
        "list_files",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "list_files",
    description: "List directory contents with options.",
    schema: listFilesInputSchema,
  },
);
