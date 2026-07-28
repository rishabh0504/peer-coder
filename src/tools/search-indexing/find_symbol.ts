import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { z } from "zod";

export const findSymbolInputSchema = z.object({
  symbol: z.string().describe("Target symbol name to locate"),
});

export const findSymbolTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "find_symbol",
      input,
      async (_context, args) => {
        return {
          symbol: args.symbol,
          matches: [],
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to find symbol.",
        "find_symbol",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "find_symbol",
    description: "Locate symbol definition or AST nodes in workspace.",
    schema: findSymbolInputSchema,
  },
);
