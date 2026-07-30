import { describe, expect, it } from "vitest";
import { fillByUtility, utility } from "../../src/memory/context/budget_manager.js";
import { createMemoryManager } from "../../src/memory/index.js";
import { extractNeeds } from "../../src/memory/planner/need_extractors.js";

describe("memory Stage 0", () => {
  it("extracts symbol and failure needs deterministically", () => {
    const needs = extractNeeds("Why is AgentRuntime failing in agent_runtime.ts?");
    expect(needs.some((n) => n.kind === "symbol" && n.name === "AgentRuntime")).toBe(true);
    expect(needs.some((n) => n.kind === "file")).toBe(true);
    expect(needs.some((n) => n.kind === "experience")).toBe(true);
  });

  it("L0/L1 round-trip", async () => {
    const mm = createMemoryManager();
    mm.bindExecution({
      executionId: "ex1",
      workspaceId: "/tmp/ws",
      goal: "test",
      currentPlan: [],
      visitedFiles: [],
      activeErrors: [],
      pendingActions: [],
      currentToolResults: [],
      updatedAt: new Date().toISOString(),
    });
    expect(mm.getExecution("ex1")?.goal).toBe("test");

    const task = await mm.createTask({
      workspaceId: "/tmp/ws",
      goal: "Add OAuth",
      status: "active",
      todos: [{ id: "a", title: "step", done: false }],
      knownIssues: [],
      decisions: [],
      filesTouched: [],
      architectureNotes: [],
      acceptanceCriteria: [],
      testStrategy: [],
    });
    expect((await mm.getTask(task.id))?.goal).toBe("Add OAuth");
  });

  it("ranks by utility density", () => {
    expect(utility(0.9, 50)).toBeGreaterThan(utility(0.95, 500));
    const filled = fillByUtility(
      [
        { score: 0.95, tokenCost: 500, text: "big" },
        { score: 0.9, tokenCost: 50, text: "small" },
      ],
      100,
    );
    expect(filled).toEqual(["small"]);
  });

  it("planAndRecall returns dual context", async () => {
    const mm = createMemoryManager();
    mm.bindExecution({
      executionId: "ex2",
      workspaceId: "/ws",
      goal: "AgentRuntime",
      currentPlan: [],
      visitedFiles: [],
      activeErrors: [],
      pendingActions: [],
      currentToolResults: [],
      updatedAt: new Date().toISOString(),
    });
    const pack = await mm.planAndRecall("AgentRuntime", {
      workspaceId: "/ws",
      executionId: "ex2",
    });
    expect(pack.systemMemory).toBeDefined();
    expect(pack.taskMemory.execution?.executionId).toBe("ex2");
  });
});
