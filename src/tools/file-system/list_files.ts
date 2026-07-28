import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { z } from "zod";

export const listFilesInputSchema = z.object({
  path: z.string().optional().describe("Directory or file path to list"),
  recursive: z.boolean().default(true).describe("Set to true for recursive walking"),
  maxDepth: z.number().int().min(1).optional().describe("Maximum directory depth limit"),
  maxResults: z.number().int().min(1).optional().describe("Maximum number of files returned"),
  extensions: z
    .array(z.string())
    .optional()
    .describe("Filter by file extensions (e.g. ['.ts', '.js'])"),
});

export const listFilesTool = tool(
  async (input) => {
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
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to list files.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "list_files",
    description:
      "List files and directories within workspace with recursive walking and filtering.",
    schema: listFilesInputSchema,
  },
);
