import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/context/workspace_context.js";
import { z } from "zod";

const execAsync = promisify(exec);

export const gitDiffInputSchema = z.object({
  path: z.string().optional().describe("Specific target file path for git diff"),
});

export const gitDiffTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "git_diff",
      input,
      async (context, args) => {
        const targetPath = args.path ? ` -- "${args.path}"` : "";
        const { stdout } = await execAsync(`git diff${targetPath}`, { cwd: context.workspaceRoot });
        return {
          diff: stdout.trim(),
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to get git diff.",
        "git_diff",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "git_diff",
    description: "Inspect uncommitted working directory git diffs.",
    schema: gitDiffInputSchema,
  },
);
