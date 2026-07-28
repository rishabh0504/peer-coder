import { executeCommandTool } from "@tools/execution/execute_command.js";
import { getCommandOutputTool } from "@tools/execution/get_command_output.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { describe, expect, it } from "vitest";

describe("execution Tools Suite", () => {
  const context = createDefaultWorkspaceContext();

  it("should execute benign command (echo hello) and return stdout", async () => {
    const result = await executeCommandTool.invoke(
      { command: "echo 'hello runtime'" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.stdout).toBe("hello runtime");
    expect(parsed.exitCode).toBe(0);
  });

  it("should return process output status for get_command_output", async () => {
    const result = await getCommandOutputTool.invoke(
      { processId: "proc_123" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.processId).toBe("proc_123");
    expect(parsed.status).toBe("completed");
  });
});
