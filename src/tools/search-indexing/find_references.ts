import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { z } from "zod";

export const findReferencesInputSchema = z.object({
  symbol: z.string().describe("Symbol name to find references for"),
});

export const findReferencesTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute(
      "find_references",
      input,
      async (_context, args) => {
        return {
          symbol: args.symbol,
          references: [],
        };
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to find references.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "find_references",
    description: "Find all usages and references of a symbol across workspace source code.",
    schema: findReferencesInputSchema,
  },
);
