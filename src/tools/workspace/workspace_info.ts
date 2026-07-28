import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { z } from "zod";

export const workspaceInfoInputSchema = z.object({});

export const workspaceInfoTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute("workspace_info", input, async (context) => {
      return {
        workspaceRoot: context.workspaceRoot,
        permissions: context.permissions,
        maxFileSizeByte: context.configuration.maxFileSizeByte,
      };
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to retrieve workspace info.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "workspace_info",
    description: "Get current workspace metadata, root directory, and active security permissions.",
    schema: workspaceInfoInputSchema,
  },
);
