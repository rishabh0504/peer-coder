import { exec } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { z } from "zod";

const execAsync = promisify(exec);

export const executeCommandInputSchema = z.object({
  command: z.string().describe("Terminal command string to execute"),
  timeoutMs: z
    .number()
    .int()
    .positive()
    .default(30000)
    .describe("Execution timeout in milliseconds"),
});

export const executeCommandTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute(
      "execute_command",
      input,
      async (context, args) => {
        const cwd = context.workspaceRoot;
        const { stdout, stderr } = await execAsync(args.command, {
          cwd,
          timeout: args.timeoutMs,
        });

        return {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
        };
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to execute command.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "execute_command",
    description:
      "Safely execute terminal commands within workspace boundaries with timeout and policy enforcement.",
    schema: executeCommandInputSchema,
  },
);
