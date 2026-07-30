import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentOutcome } from "../../src/agents/core/agent_result.js";
import { agentRuntime } from "../../src/agents/runtime/instance.js";
import { analyzeCommand } from "../../src/cli/analyze.js";

vi.mock("../../src/agents/runtime/instance.js", () => ({
  agentRuntime: {
    execute: vi.fn(),
  },
}));

vi.mock("../../src/core/utils/spinner.js", () => ({
  startAgentSpinner: vi.fn(),
  stopAgentSpinner: vi.fn(),
}));

describe("Analyze CLI Command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should execute workspace intelligence agent and render output upon success", async () => {
    const mockResult = {
      outcome: AgentOutcome.SUCCESS,
      data: {
        workspaceContext: {
          projectName: "test-project",
          languages: ["TypeScript"],
          frameworks: ["Vite"],
        },
        summary: "This is a summary",
        status: "completed",
      },
    };

    const mockHandle = {
      id: "exec_123",
      cancel: vi.fn(),
      result: async () => mockResult,
    };

    vi.mocked(agentRuntime.execute).mockReturnValue(mockHandle as any);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await analyzeCommand(".", false);

    expect(agentRuntime.execute).toHaveBeenCalledWith(
      "workspace_intelligence",
      { workspacePath: ".", includeSummary: false },
      expect.any(Object),
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should output error message on agent failure", async () => {
    const mockResult = {
      outcome: AgentOutcome.FAILED,
      error: {
        code: "TEST_ERROR",
        message: "Something failed",
      },
    };

    const mockHandle = {
      id: "exec_123",
      cancel: vi.fn(),
      result: async () => mockResult,
    };

    vi.mocked(agentRuntime.execute).mockReturnValue(mockHandle as any);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await analyzeCommand(".", false);

    expect(consoleSpy).toHaveBeenCalled();
    const calls = consoleSpy.mock.calls.flat().join(" ");
    expect(calls).toContain("Something failed");
    consoleSpy.mockRestore();
  });
});
