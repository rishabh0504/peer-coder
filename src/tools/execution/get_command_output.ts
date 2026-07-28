import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { z } from "zod";

export const getCommandOutputInputSchema = z.object({
  processId: z.string().describe("Process ID of the execution command"),
});

export const getCommandOutputTool = tool(
  async (input) => {
    const response = await defaultToolRuntime.execute(
      "get_command_output",
      input,
      async (_context, args) => {
        return {
          processId: args.processId,
          stdout: "",
          status: "completed",
        };
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Failed to retrieve process output.");
    }

    return JSON.stringify(response.data);
  },
  {
    name: "get_command_output",
    description: "Get terminal command execution output buffer by process ID.",
    schema: getCommandOutputInputSchema,
  },
);
