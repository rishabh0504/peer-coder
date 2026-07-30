import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/context/workspace_context.js";
import { z } from "zod";
import { getWorkspaceGraph } from "../../workspace/graph/index.js";

export const findSymbolInputSchema = z.object({
  symbol: z.string().min(1).describe("Target symbol name to locate"),
  workspacePath: z.string().optional().describe("Workspace root (defaults to cwd)"),
});

export const findSymbolTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "find_symbol",
      input,
      async (context, args) => {
        const workspacePath =
          (args as { workspacePath?: string }).workspacePath ||
          context.workspaceRoot ||
          process.cwd();
        const graph = getWorkspaceGraph();
        const matches = await graph.findSymbols(workspacePath, (args as { symbol: string }).symbol);
        return {
          symbol: (args as { symbol: string }).symbol,
          matches,
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
    description: "Locate symbol definitions across any language in the workspace.",
    schema: findSymbolInputSchema,
  },
);
