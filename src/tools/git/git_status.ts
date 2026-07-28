import { exec } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { z } from "zod";

const execAsync = promisify(exec);

export const gitStatusInputSchema = z.object({});

export const gitStatusTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute("git_status", input, async (context) => {
      const { stdout } = await execAsync("git status --short", { cwd: context.workspaceRoot });
      return { status: stdout.trim() };
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to execute git status.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "git_status",
    description: "Get repository git status working tree changes.",
    schema: gitStatusInputSchema,
  },
);
