import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { z } from "zod";

export const createFileInputSchema = z.object({
  path: z.string().describe("Relative or absolute path to the file to create"),
  content: z.string().describe("Content to write into the file"),
  overwrite: z.boolean().default(false).describe("Set to true to overwrite existing files"),
});

export const createFileTool = tool(
  async (input) => {
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
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to create file.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "create_file",
    description: "Create a new file with content, creating parent directories automatically.",
    schema: createFileInputSchema,
  },
);
