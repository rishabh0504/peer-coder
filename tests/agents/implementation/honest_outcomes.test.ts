import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resetArtifactStoreForTests } from "../../../src/agents/artifacts/index.js";
import { AgentOutcome } from "../../../src/agents/core/agent_result.js";
import { implementationHandler } from "../../../src/agents/implementation/handler.js";
import type { ToolLoopLlm } from "../../../src/agents/runtime/tool_loop.js";
import { createMemoryManager } from "../../../src/memory/index.js";
import { getTaskManager } from "../../../src/orchestration/task_manager.js";

async function setupTask(workspacePath: string) {
  const mm = createMemoryManager();
  const tm = getTaskManager(mm);
  const task = await tm.createTask({
    workspacePath,
    goal: "add hello",
    userRequest: "add hello",
  });
  await tm.updateTodos(task.id, [{ id: "implement", title: "Implement", done: false }]);
  return { mm, task };
}

describe("implementation honest outcomes", () => {
  it("FAILED on tool loop error without marking step done", async () => {
    resetArtifactStoreForTests();
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "peer-impl-"));
    const { mm, task } = await setupTask(workspacePath);

    const llm: ToolLoopLlm = {
      invoke: async () => {
        throw new Error("ollama down");
      },
    };

    const result = await implementationHandler.execute(
      { workspacePath, taskId: task.id, stepId: "implement" },
      {
        sessionId: "s",
        executionId: "e",
        traceId: "t",
        signal: new AbortController().signal,
        metadata: { useToolLoop: true },
        container: {
          tools: { execute: async () => ({}) },
          memory: { get: async () => null, set: async () => {}, delete: async () => {} },
          memoryManager: mm as never,
          toolLoopLlm: llm,
        } as never,
      },
    );

    expect(result.outcome).toBe(AgentOutcome.FAILED);
    expect(result.error?.code).toBe("IMPL_LOOP_ERROR");
    const updated = await mm.getTask(task.id);
    expect(updated?.todos.find((t) => t.id === "implement")?.done).toBe(false);
  });

  it("PARTIAL when final with no mutating tools", async () => {
    resetArtifactStoreForTests();
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "peer-impl-"));
    const { mm, task } = await setupTask(workspacePath);

    const llm: ToolLoopLlm = {
      invoke: async () => ({ content: "done without edits", toolCalls: [] }),
    };

    const result = await implementationHandler.execute(
      { workspacePath, taskId: task.id, stepId: "implement" },
      {
        sessionId: "s",
        executionId: "e",
        traceId: "t",
        signal: new AbortController().signal,
        metadata: { useToolLoop: true },
        container: {
          tools: { execute: async () => ({}) },
          memory: { get: async () => null, set: async () => {}, delete: async () => {} },
          memoryManager: mm as never,
          toolLoopLlm: llm,
        } as never,
      },
    );

    expect(result.outcome).toBe(AgentOutcome.PARTIAL);
    expect(result.error?.code).toBe("IMPL_NO_MUTATION");
  });

  it("SUCCESS with scaffoldNote path", async () => {
    resetArtifactStoreForTests();
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "peer-impl-"));
    const { mm, task } = await setupTask(workspacePath);

    const result = await implementationHandler.execute(
      {
        workspacePath,
        taskId: task.id,
        stepId: "implement",
        scaffoldNote: "# scaffold",
      },
      {
        sessionId: "s",
        executionId: "e",
        traceId: "t",
        signal: new AbortController().signal,
        metadata: {},
        container: {
          tools: { execute: async () => ({}) },
          memory: { get: async () => null, set: async () => {}, delete: async () => {} },
          memoryManager: mm as never,
        },
      },
    );

    expect(result.outcome).toBe(AgentOutcome.SUCCESS);
    expect((result.data as { filesChanged: string[] }).filesChanged.length).toBeGreaterThan(0);
  });

  it("SUCCESS when mutating tool used", async () => {
    resetArtifactStoreForTests();
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "peer-impl-"));
    const { mm, task } = await setupTask(workspacePath);
    let n = 0;
    const llm: ToolLoopLlm = {
      invoke: async () => {
        n++;
        if (n === 1) {
          return {
            content: "",
            toolCalls: [
              {
                id: "1",
                name: "create_file",
                args: { path: "hello.ts", content: "export const hello = () => 'hi';" },
              },
            ],
          };
        }
        return { content: "done", toolCalls: [] };
      },
    };

    const result = await implementationHandler.execute(
      { workspacePath, taskId: task.id, stepId: "implement" },
      {
        sessionId: "s",
        executionId: "e",
        traceId: "t",
        signal: new AbortController().signal,
        metadata: { useToolLoop: true },
        container: {
          tools: {
            execute: vi.fn(async () => JSON.stringify({ ok: true })),
          },
          memory: { get: async () => null, set: async () => {}, delete: async () => {} },
          memoryManager: mm as never,
          toolLoopLlm: llm,
        } as never,
      },
    );

    expect(result.outcome).toBe(AgentOutcome.SUCCESS);
  });
});
