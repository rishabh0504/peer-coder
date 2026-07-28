import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { z } from "zod";

const execAsync = promisify(exec);

export const gitStatusInputSchema = z.object({});

export const gitStatusTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "git_status",
      input,
      async (context) => {
        const { stdout } = await execAsync("git status --short", { cwd: context.workspaceRoot });
        return {
          status: stdout.trim(),
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to get git status.",
        "git_status",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "git_status",
    description: "Check git repository branch status and modified file states.",
    schema: gitStatusInputSchema,
  },
);
