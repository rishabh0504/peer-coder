import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { z } from "zod";

export const findReferencesInputSchema = z.object({
  symbol: z.string().describe("Target symbol name to find references for"),
});

export const findReferencesTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "find_references",
      input,
      async (_context, args) => {
        return {
          symbol: args.symbol,
          references: [],
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to find references.",
        "find_references",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "find_references",
    description: "Find all references of symbol across workspace.",
    schema: findReferencesInputSchema,
  },
);
