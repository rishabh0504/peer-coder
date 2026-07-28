import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { z } from "zod";

export const workspaceInfoInputSchema = z.object({});

export const workspaceInfoTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "workspace_info",
      input,
      async (context) => {
        return {
          workspaceRoot: context.workspaceRoot,
          permissions: context.permissions,
          maxFileSizeByte: context.configuration.maxFileSizeByte,
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to get workspace info.",
        "workspace_info",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "workspace_info",
    description: "Fetch workspace environment config and root metadata.",
    schema: workspaceInfoInputSchema,
  },
);
