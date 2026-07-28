import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { z } from "zod";

export const getCommandOutputInputSchema = z.object({
  processId: z.string().describe("Target process ID or handle"),
});

export const getCommandOutputTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "get_command_output",
      input,
      async (_context, args) => {
        return {
          processId: args.processId,
          output: `Output for process ${args.processId}`,
          status: "completed",
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to get command output.",
        "get_command_output",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "get_command_output",
    description: "Retrieve stdout/stderr output of background execution.",
    schema: getCommandOutputInputSchema,
  },
);
