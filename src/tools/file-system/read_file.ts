import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { z } from "zod";

export const readFileInputSchema = z.object({
  path: z.string().describe("Relative or absolute path to the target file"),
  startLine: z.number().int().min(1).optional().describe("1-indexed starting line range"),
  endLine: z.number().int().min(1).optional().describe("1-indexed ending line range"),
  includeLineNumbers: z.boolean().default(true).describe("Prepend line numbers to output content"),
});

export const readFileTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute("read_file", input, async (context, args) => {
      return await workspaceFileSystem.readFile(
        context,
        args.path,
        args.startLine,
        args.endLine,
        args.includeLineNumbers,
      );
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to read file.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "read_file",
    description:
      "Read contents of a file within the workspace with line windowing and security checks.",
    schema: readFileInputSchema,
  },
);
