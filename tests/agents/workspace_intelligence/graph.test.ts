import { afterEach, describe, expect, it, vi } from "vitest";
import { workspaceIntelligenceGraph } from "../../../src/agents/workspace_intelligence/graph.js";
import { ollamaInstance } from "../../../src/providers/ollama/index.js";
import { workspaceAnalyzer } from "../../../src/workspace/analyzer/analyzer.js";

describe("Workspace Intelligence Graph", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("compiles and runs successfully on current workspace directory", async () => {
    const initialState = {
      sessionId: "session_test",
      userRequest: "analyze",
      workspacePath: ".",
      includeSummary: false,
    };

    const finalState = await workspaceIntelligenceGraph.invoke(initialState);
    expect(finalState).toBeDefined();
    expect(finalState.status).toBe("completed");
    expect(finalState.workspaceContext).toBeDefined();
    expect(finalState.workspaceContext.workspaceRoot).toBeDefined();
    expect(finalState.workspaceContext.languages).toContain("typescript");
  });

  it("gracefully runs handle_error and fails on invalid workspacePath", async () => {
    const initialState = {
      sessionId: "session_test",
      userRequest: "analyze",
      workspacePath: "./invalid-folder-path",
      includeSummary: false,
    };

    const finalState = await workspaceIntelligenceGraph.invoke(initialState);
    expect(finalState).toBeDefined();
    expect(finalState.status).toBe("failed");
    expect(finalState.errors).toBeDefined();
    expect(finalState.errors.length).toBeGreaterThan(0);
    expect(finalState.errors[0].code).toBe("INVALID_WORKSPACE");
  });

  it("routes to summarizeWorkspace when includeSummary is true", async () => {
    const initialState = {
      sessionId: "session_test",
      userRequest: "analyze",
      workspacePath: ".",
      includeSummary: true,
    };

    const spy = vi.spyOn(ollamaInstance, "invoke").mockResolvedValue({
      content: "Summary text",
    } as any);

    const finalState = await workspaceIntelligenceGraph.invoke(initialState);
    expect(finalState.status).toBe("completed");
    expect(finalState.summary).toBe("Summary text");

    spy.mockRestore();
  });

  it("routes to handle_error when workspace.analyze node fails", async () => {
    const initialState = {
      sessionId: "session_test",
      userRequest: "analyze",
      workspacePath: ".",
      includeSummary: false,
    };

    const spy = vi.spyOn(workspaceAnalyzer, "analyze").mockRejectedValue(new Error("Scan failure"));

    const finalState = await workspaceIntelligenceGraph.invoke(initialState);
    expect(finalState.status).toBe("failed");
    expect(finalState.errors?.some((e: any) => e.code === "ANALYSIS_FAILED")).toBe(true);

    spy.mockRestore();
  });

  it("routes to handle_error when workspace.build_context node fails", async () => {
    const initialState = {
      sessionId: "session_test",
      userRequest: "analyze",
      workspacePath: ".",
      includeSummary: false,
    };

    // Mock analyze to return undefined, causing build_context to fail
    const spy = vi.spyOn(workspaceAnalyzer, "analyze").mockResolvedValue(undefined as any);

    const finalState = await workspaceIntelligenceGraph.invoke(initialState);
    expect(finalState.status).toBe("failed");
    expect(finalState.errors?.some((e: any) => e.code === "BUILD_CONTEXT_FAILED")).toBe(true);

    spy.mockRestore();
  });
});
