import path from "node:path";
import { describe, expect, it } from "vitest";
import { codeIntelligenceHandler } from "../../../src/agents/code_intelligence/handler.js";
import { AgentOutcome } from "../../../src/agents/core/agent_result.js";
import { createDefaultIndexer } from "../../../src/code_intel/indexer/index.js";
import { createMemoryManager } from "../../../src/memory/index.js";

describe("code intelligence", () => {
  const workspacePath = path.resolve(__dirname, "../../..");

  it("indexes AgentRuntime via polyglot indexer", async () => {
    const indexer = createDefaultIndexer();
    const result = await indexer.index({
      workspacePath,
      query: "AgentRuntime",
      maxFiles: 200,
    });
    expect(result.symbols.some((s: { name: string }) => s.name === "AgentRuntime")).toBe(true);
    expect(result.impactedPaths.length).toBeGreaterThan(0);
  });

  it("handler upserts L3 and returns CodeIntelResult", async () => {
    const mm = createMemoryManager();
    const result = await codeIntelligenceHandler.execute(
      { workspacePath, query: "AgentRuntime", maxFiles: 200 },
      {
        sessionId: "s1",
        executionId: "e1",
        traceId: "t1",
        signal: new AbortController().signal,
        metadata: {},
        container: {
          tools: { execute: async () => null },
          memory: { get: async () => null, set: async () => {}, delete: async () => {} },
          memoryManager: mm as never,
        },
      },
    );
    expect(result.outcome).toBe(AgentOutcome.SUCCESS);
    expect(mm.getL3Symbols(workspacePath, "AgentRuntime").length).toBeGreaterThan(0);
  });
});
