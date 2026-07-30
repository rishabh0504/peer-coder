import type { BaseMessage } from "@langchain/core/messages";
import { describe, expect, it, vi } from "vitest";
import type { ToolService } from "../../../src/agents/core/execution_context.js";
import { type ToolLoopLlm, runAgentToolLoop } from "../../../src/agents/runtime/tool_loop.js";

describe("AgentToolLoop", () => {
  it("stops on final text with no tool calls", async () => {
    const llm: ToolLoopLlm = {
      invoke: async () => ({ content: "done", toolCalls: [] }),
    };
    const tools: ToolService = { execute: vi.fn() };
    const result = await runAgentToolLoop({
      llm,
      tools,
      systemPrompt: "sys",
      userPrompt: "hi",
      maxIterations: 3,
    });
    expect(result.stopReason).toBe("final");
    expect(result.finalText).toBe("done");
    expect(tools.execute).not.toHaveBeenCalled();
  });

  it("executes tools then finalizes", async () => {
    let n = 0;
    const llm: ToolLoopLlm = {
      invoke: async (_messages: BaseMessage[]) => {
        n++;
        if (n === 1) {
          return {
            content: "",
            toolCalls: [{ id: "1", name: "web_search", args: { query: "x" } }],
          };
        }
        return { content: "answer", toolCalls: [] };
      },
    };
    const tools: ToolService = {
      execute: async () => ({ results: [] }),
    };
    const result = await runAgentToolLoop({
      llm,
      tools,
      systemPrompt: "sys",
      userPrompt: "search",
      maxIterations: 5,
    });
    expect(result.stopReason).toBe("final");
    expect(result.toolsUsed).toContain("web_search");
    expect(result.finalText).toBe("answer");
  });

  it("respects maxIterations", async () => {
    const llm: ToolLoopLlm = {
      invoke: async () => ({
        content: "",
        toolCalls: [{ id: "1", name: "web_search", args: {} }],
      }),
    };
    const tools: ToolService = { execute: async () => ({}) };
    const result = await runAgentToolLoop({
      llm,
      tools,
      systemPrompt: "sys",
      userPrompt: "loop",
      maxIterations: 2,
    });
    expect(result.stopReason).toBe("max_iterations");
    expect(result.iterations).toBe(2);
  });

  it("detects need_research in final text", async () => {
    const llm: ToolLoopLlm = {
      invoke: async () => ({ content: "NEED_RESEARCH: unknown API", toolCalls: [] }),
    };
    const result = await runAgentToolLoop({
      llm,
      tools: { execute: async () => ({}) },
      systemPrompt: "sys",
      userPrompt: "code",
    });
    expect(result.stopReason).toBe("need_research");
  });
});
