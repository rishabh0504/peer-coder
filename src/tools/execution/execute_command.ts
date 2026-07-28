import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { validatePath } from "@workspace/workspace_guard.js";
import { z } from "zod";

const execAsync = promisify(exec);

export const executeCommandInputSchema = z.object({
  command: z.string().describe("Terminal shell command to execute"),
  cwd: z.string().optional().describe("Working directory for execution"),
});

export const executeCommandTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "execute_command",
      input,
      async (context, args) => {
        const workingDir = args.cwd ? validatePath(context, args.cwd) : context.workspaceRoot;
        const { stdout, stderr } = await execAsync(args.command, { cwd: workingDir });
        return {
          command: args.command,
          cwd: workingDir,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to execute command.",
        "execute_command",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "execute_command",
    description: "Run terminal shell command in current working directory.",
    schema: executeCommandInputSchema,
  },
);
