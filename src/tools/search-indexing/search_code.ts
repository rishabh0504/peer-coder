import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/context/workspace_context.js";
import { z } from "zod";

export const searchCodeInputSchema = z.object({
  query: z.string().min(1).describe("Search query string or pattern"),
  path: z.string().default(".").describe("Directory path to search within"),
  recursive: z.boolean().default(true).describe("Search subdirectories recursively"),
});

export const searchCodeTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "search_code",
      input,
      async (_context, args) => {
        return {
          query: args.query,
          matches: [],
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to search code.",
        "search_code",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "search_code",
    description: "Fast pattern/regex search across codebase.",
    schema: searchCodeInputSchema,
  },
);
