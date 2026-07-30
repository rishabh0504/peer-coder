import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { getArtifactStore, resetArtifactStoreForTests } from "../../src/agents/artifacts/index.js";
import { createMemoryManager } from "../../src/memory/index.js";
import {
  createContextEngine,
  getExecutionJournal,
  getTaskManager,
  resetExecutionJournalForTests,
} from "../../src/orchestration/index.js";
import { getWorkspaceGraph, resetWorkspaceGraphForTests } from "../../src/workspace/graph/index.js";

describe("orchestration substrate", () => {
  beforeEach(() => {
    resetArtifactStoreForTests();
    resetExecutionJournalForTests();
    resetWorkspaceGraphForTests();
  });

  it("stores typed artifacts and retrieves by kind", () => {
    const store = getArtifactStore();
    const env = store.put({
      taskId: "t1",
      kind: "research",
      producerAgentId: "research",
      data: {
        query: "zod docs",
        findings: [{ title: "Zod", url: "https://example.com", excerpt: "schema" }],
        notes: ["ok"],
        confidence: "medium",
      },
    });
    expect(env.id).toBeTruthy();
    expect(store.latestByKind("t1", "research")?.data).toMatchObject({ query: "zod docs" });
  });

  it("TaskManager creates and attaches artifacts", async () => {
    const mm = createMemoryManager();
    const tm = getTaskManager(mm);
    const task = await tm.createTask({
      workspacePath: "/tmp/ws",
      goal: "test",
      userRequest: "do thing",
    });
    const art = getArtifactStore().put({
      taskId: task.id,
      kind: "plan",
      producerAgentId: "planning",
      data: {
        taskId: task.id,
        goal: "test",
        tasks: [{ id: "a", title: "A", dependsOn: [], filesLikely: [] }],
        order: ["a"],
        risks: [],
        acceptanceCriteria: [],
        testStrategy: [],
      },
    });
    await tm.attachArtifact(task.id, art.id);
    expect(tm.getArtifactIds(task.id)).toContain(art.id);
  });

  it("ExecutionJournal records and detects research retry", () => {
    const j = getExecutionJournal();
    j.append({
      taskId: "t1",
      executionId: "e1",
      agentId: "implementation",
      outcome: "partial",
      note: "research_retry",
    });
    expect(j.hasImplResearchRetry("t1")).toBe(true);
  });

  it("ContextEngine builds artifact slice for planning", async () => {
    const store = getArtifactStore();
    store.put({
      taskId: "t1",
      kind: "repository_profile",
      producerAgentId: "workspace_intelligence",
      data: {
        workspaceRoot: "/tmp",
        languages: ["typescript"],
        frameworks: [],
        runtimes: [],
        testFrameworks: [],
        importantFiles: [],
      },
    });
    const ce = createContextEngine();
    const pack = await ce.buildForAgent({
      agentId: "planning",
      taskId: "t1",
      workspacePath: "/tmp",
      userRequest: "add feature",
    });
    expect(pack.artifactSlice.repository_profile).toBeTruthy();
    expect(pack.promptText).toContain("repository_profile");
  });

  it("WorkspaceGraph caches repository profile", async () => {
    const g = getWorkspaceGraph();
    await g.setRepositoryProfile("/ws", {
      workspaceRoot: "/ws",
      languages: ["python"],
      frameworks: [],
      runtimes: [],
      testFrameworks: [],
      importantFiles: [],
    });
    const p = await g.getRepositoryProfile("/ws");
    expect(p?.languages).toEqual(["python"]);
  });

  it("WorkspaceGraph markIndexed prevents double ensure when stats exist", async () => {
    const fixture = path.resolve(__dirname, "../fixtures/polyglot/python");
    const g = getWorkspaceGraph();
    const first = await g.ensureIndexed(fixture);
    expect(first.filesSeen).toBeGreaterThan(0);
    expect(g.wasIndexed(fixture)).toBe(true);
    const second = await g.ensureIndexed(fixture);
    expect(second).toBeTruthy();
  });
});
