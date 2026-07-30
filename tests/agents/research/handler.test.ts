import { describe, expect, it, vi } from "vitest";
import { resetArtifactStoreForTests } from "../../../src/agents/artifacts/index.js";
import { AgentOutcome } from "../../../src/agents/core/agent_result.js";
import { researchHandler } from "../../../src/agents/research/handler.js";

describe("research agent", () => {
  it("builds ResearchResult from tool outputs", async () => {
    resetArtifactStoreForTests();
    const tools = {
      execute: vi.fn(async (name: string) => {
        if (name === "web_search") {
          return JSON.stringify({
            results: [
              {
                title: "Zod",
                url: "https://zod.dev",
                snippet: "TypeScript-first schema",
              },
            ],
          });
        }
        if (name === "fetch_webpage") {
          return "Zod documentation body content here";
        }
        throw new Error(`unexpected ${name}`);
      }),
    };

    const result = await researchHandler.execute(
      { workspacePath: "/tmp", query: "zod schema", taskId: "t-research" },
      {
        sessionId: "s",
        executionId: "e",
        traceId: "t",
        signal: new AbortController().signal,
        metadata: {},
        container: {
          tools,
          memory: { get: async () => null, set: async () => {}, delete: async () => {} },
        },
      },
    );

    expect(result.outcome).toBe(AgentOutcome.SUCCESS);
    expect(result.data).toMatchObject({
      query: "zod schema",
      confidence: "medium",
    });
    expect((result.data as { findings: unknown[] }).findings.length).toBeGreaterThan(0);
  });
});
