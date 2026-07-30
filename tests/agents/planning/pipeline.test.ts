import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PlanResult } from "../../../src/agents/contracts/index.js";
import { AgentOutcome } from "../../../src/agents/core/agent_result.js";
import { implementationHandler } from "../../../src/agents/implementation/handler.js";
import { planningHandler } from "../../../src/agents/planning/handler.js";
import { verificationHandler } from "../../../src/agents/verification/handler.js";
import { createMemoryManager } from "../../../src/memory/index.js";

function ctx(mm: ReturnType<typeof createMemoryManager>) {
  return {
    sessionId: "s1",
    executionId: "e1",
    traceId: "t1",
    signal: new AbortController().signal,
    metadata: {},
    container: {
      tools: { execute: async () => null },
      memory: { get: async () => null, set: async () => {}, delete: async () => {} },
      memoryManager: mm as any,
    },
  };
}

describe("planning / implementation / verification", () => {
  it("plans into L1 and validates PlanResult shape", async () => {
    const mm = createMemoryManager();
    const dir = await mkdtemp(path.join(os.tmpdir(), "peer-plan-"));
    try {
      const result = await planningHandler.execute(
        { workspacePath: dir, userRequest: "Add OAuth" },
        ctx(mm),
      );
      expect(result.outcome).toBe(AgentOutcome.SUCCESS);
      const data = result.data as PlanResult;
      expect(data.taskId).toBeTruthy();
      expect(data.tasks.length).toBeGreaterThan(0);
      expect(await mm.getTask(data.taskId)).toBeTruthy();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("implements a planned task and marks a step done", async () => {
    const mm = createMemoryManager();
    const dir = await mkdtemp(path.join(os.tmpdir(), "peer-impl-"));
    try {
      const planned = await planningHandler.execute(
        { workspacePath: dir, userRequest: "Scaffold note" },
        ctx(mm),
      );
      const plan = planned.data as PlanResult;
      const impl = await implementationHandler.execute(
        { workspacePath: dir, taskId: plan.taskId, stepId: "discover" },
        { ...ctx(mm), executionId: "e2" },
      );
      expect(impl.outcome).toBe(AgentOutcome.SUCCESS);
      const task = await mm.getTask(plan.taskId);
      expect(task?.todos.find((t) => t.id === "discover")?.done).toBe(true);
      expect((impl.data as any).filesChanged.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("verification runs override command", async () => {
    const mm = createMemoryManager();
    const result = await verificationHandler.execute(
      { workspacePath: process.cwd(), commands: ['node -e "process.exit(0)"'] },
      ctx(mm),
    );
    expect([AgentOutcome.SUCCESS, AgentOutcome.PARTIAL]).toContain(result.outcome);
    expect((result.data as any).commandsRun[0].exitCode).toBe(0);
  });
});
