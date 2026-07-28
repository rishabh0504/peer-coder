import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { z } from "zod";

export const applyPatchInputSchema = z.object({
  path: z.string().describe("Relative or absolute path to the file to patch"),
  startLine: z.number().int().min(1).describe("1-indexed starting line to replace"),
  endLine: z.number().int().min(1).describe("1-indexed ending line to replace"),
  replacement: z.string().describe("New replacement content for specified line range"),
});

export const applyPatchTool = tool(
  async (input) => {
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
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to apply patch.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "apply_patch",
    description: "Surgically patch a file by replacing a specific line range with new content.",
    schema: applyPatchInputSchema,
  },
);
