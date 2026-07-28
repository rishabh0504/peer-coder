import { exec } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { z } from "zod";

const execAsync = promisify(exec);

export const gitDiffInputSchema = z.object({
  target: z.string().optional().describe("Commit or branch target to diff against"),
});

export const gitDiffTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute("git_diff", input, async (context, args) => {
      const cmd = args.target ? `git diff ${args.target}` : "git diff";
      const { stdout } = await execAsync(cmd, { cwd: context.workspaceRoot });
      return { diff: stdout.trim() };
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to execute git diff.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "git_diff",
    description: "Get repository git diff changes.",
    schema: gitDiffInputSchema,
  },
);
