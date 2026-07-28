import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { z } from "zod";

export const findSymbolInputSchema = z.object({
  symbol: z.string().describe("Symbol or identifier name to search for"),
});

export const findSymbolTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute(
      "find_symbol",
      input,
      async (_context, args) => {
        return {
          symbol: args.symbol,
          matches: [],
        };
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to find symbol.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "find_symbol",
    description: "Find symbol definitions within workspace source code.",
    schema: findSymbolInputSchema,
  },
);
