import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { workspaceFileSystem } from "@services/filesystem/filesystem.service.js";
import { z } from "zod";

export const searchCodeInputSchema = z.object({
  query: z.string().describe("Search term or pattern to look for"),
  isRegex: z.boolean().default(false).describe("Set to true for regex search"),
});

export const searchCodeTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute(
      "search_code",
      input,
      async (context, args) => {
        const fileList = await workspaceFileSystem.listFiles(context, { recursive: true });
        const matches: Array<{ file: string; line: number; text: string }> = [];

        const regex = new RegExp(args.query, args.isRegex ? "g" : "gi");

        for (const file of fileList.files) {
          try {
            const data = await workspaceFileSystem.readFile(
              context,
              file,
              undefined,
              undefined,
              false,
            );
            const lines = data.content.split("\n");
            lines.forEach((lineText, idx) => {
              if (regex.test(lineText)) {
                matches.push({ file, line: idx + 1, text: lineText.trim() });
              }
            });
          } catch {
            // ignore unreadable/binary files
          }
        }

        return { query: args.query, totalMatches: matches.length, matches: matches.slice(0, 100) };
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to search code.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "search_code",
    description: "Search workspace source code for text or regex pattern matches.",
    schema: searchCodeInputSchema,
  },
);
