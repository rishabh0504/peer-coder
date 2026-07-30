import { executeCommandTool } from "@tools/execution/execute_command.js";
import { getCommandOutputTool } from "@tools/execution/get_command_output.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
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

  it("should execute command with multi-line output", async () => {
    const result = await executeCommandTool.invoke(
      { command: "printf 'line1\\nline2\\n'" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.stdout).toBe("line1\nline2");
  });

  it("should execute command in custom cwd", async () => {
    const result = await executeCommandTool.invoke(
      { command: "pwd", cwd: context.workspaceRoot },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.stdout).toBe(context.workspaceRoot);
  });

  it("should capture command output that writes to stderr but exits 0", async () => {
    const result = await executeCommandTool.invoke(
      { command: "echo 'warning message' >&2" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.stderr).toBe("warning message");
    expect(parsed.exitCode).toBe(0);
  });

  it("should validate execute_command return shape", async () => {
    const result = await executeCommandTool.invoke(
      { command: "echo 'shape'" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("command");
    expect(parsed).toHaveProperty("cwd");
    expect(parsed).toHaveProperty("stdout");
    expect(parsed).toHaveProperty("stderr");
    expect(parsed).toHaveProperty("exitCode");
  });

  it("should throw error when command execution fails (non-zero exit)", async () => {
    await expect(
      executeCommandTool.invoke(
        { command: "false" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow();
  });

  it("should throw validation error for empty command string", async () => {
    await expect(
      executeCommandTool.invoke({ command: "" }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow();
  });

  it("should throw security error for cwd breakout", async () => {
    await expect(
      executeCommandTool.invoke(
        { command: "pwd", cwd: "../../" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow(/Security Error/);
  });

  it("should throw error when cwd does not exist", async () => {
    await expect(
      executeCommandTool.invoke(
        { command: "ls", cwd: "non_existent_dir_abc_123" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow();
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

  it("should validate get_command_output shape", async () => {
    const result = await getCommandOutputTool.invoke(
      { processId: "proc_xyz" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("processId");
    expect(parsed).toHaveProperty("output");
    expect(parsed).toHaveProperty("status");
  });

  it("should throw error when processId is empty string in get_command_output", async () => {
    await expect(
      getCommandOutputTool.invoke(
        { processId: "" },
        { configurable: { workspaceContext: context } },
      ),
    ).rejects.toThrow();
  });
});
