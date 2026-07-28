import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { z } from "zod";

export const deleteFileInputSchema = z.object({
  path: z.string().describe("Relative or absolute path to the file to delete"),
});

export const deleteFileTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute(
      "delete_file",
      input,
      async (context, args) => {
        return await workspaceFileSystem.deleteFile(context, args.path);
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to delete file.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "delete_file",
    description: "Safely delete a file from the workspace.",
    schema: deleteFileInputSchema,
  },
);
