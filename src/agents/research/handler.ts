import { createResearchBoundLlm } from "../../integration/llms/agent_model.js";
import type { InMemoryMemoryManager } from "../../memory/memory_manager.js";
import { createContextEngine } from "../../orchestration/context_engine.js";
import { getArtifactStore } from "../artifacts/index.js";
import type { ResearchResult } from "../contracts/index.js";
import type { AgentResult } from "../core/agent_result.js";
import { AgentOutcome } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import { type ToolLoopLlm, runAgentToolLoop } from "../runtime/tool_loop.js";
import type { ResearchInput } from "./schema.js";

function parseSearchPayload(raw: unknown): Array<{ title: string; url: string; excerpt: string }> {
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    const results = (data as { results?: unknown[] })?.results ?? (Array.isArray(data) ? data : []);
    return (results as Array<Record<string, unknown>>)
      .slice(0, 5)
      .map((r) => ({
        title: String(r.title ?? r.name ?? "result"),
        url: String(r.url ?? r.href ?? ""),
        excerpt: String(r.snippet ?? r.excerpt ?? r.body ?? "").slice(0, 400),
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

export const researchHandler: AgentHandler = {
  async execute(state: unknown, context: AgentExecutionContext): Promise<AgentResult> {
    try {
      const input = state as ResearchInput;
      const findings: ResearchResult["findings"] = [];
      const notes: string[] = [];

      // Prefer tool loop when LLM available; always can fall back to direct tools
      const extras = context.container as {
        toolLoopLlm?: ToolLoopLlm;
        researchToolLoopLlm?: ToolLoopLlm;
      };
      const mm = context.container.memoryManager as InMemoryMemoryManager | undefined;
      const ce = createContextEngine(mm);
      const pack = input.taskId
        ? await ce.buildForAgent({
            agentId: "research",
            taskId: input.taskId,
            workspacePath: input.workspacePath,
            userRequest: input.query,
          })
        : null;

      if (extras.researchToolLoopLlm || extras.toolLoopLlm || context.container.llm) {
        if (context.metadata?.useToolLoop === true || process.env.PEER_CODER_IMPL_LLM === "1") {
          const llm = extras.researchToolLoopLlm ?? extras.toolLoopLlm ?? createResearchBoundLlm();
          const loop = await runAgentToolLoop({
            llm,
            tools: context.container.tools,
            systemPrompt:
              "You are the Research agent. Use web_search then fetch_webpage (1-3 URLs). Do not write files. Summarize API/docs findings.",
            userPrompt: pack?.promptText ?? `Research: ${input.query}`,
            maxIterations: 8,
            timeoutMs: 120_000,
            signal: context.signal,
            allowedToolNames: ["web_search", "fetch_webpage"],
          });
          notes.push(`tool_loop:${loop.stopReason}`, ...loop.toolsUsed.map((t) => `used:${t}`));
          if (loop.finalText) notes.push(loop.finalText.slice(0, 500));
        }
      }

      // Deterministic capture via tools (also runs if loop produced nothing structured)
      try {
        const searchRaw = await context.container.tools.execute(
          "web_search",
          { query: input.query, maxResults: 5 },
          { signal: context.signal },
        );
        const hits = parseSearchPayload(searchRaw);
        findings.push(...hits.slice(0, 5));
        const urls = [...(input.urls ?? []), ...hits.map((h) => h.url)].slice(
          0,
          input.maxFetches ?? 3,
        );
        for (const url of urls) {
          try {
            const page = await context.container.tools.execute(
              "fetch_webpage",
              { url },
              { signal: context.signal },
            );
            const text = typeof page === "string" ? page : JSON.stringify(page);
            findings.push({
              title: url,
              url,
              excerpt: text.slice(0, 500),
            });
          } catch (err) {
            notes.push(`fetch_failed:${url}:${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } catch (err) {
        notes.push(`search_failed:${err instanceof Error ? err.message : String(err)}`);
      }

      const result: ResearchResult = {
        query: input.query,
        findings,
        notes,
        confidence: findings.length > 0 ? "medium" : "low",
        researchRequired: findings.length === 0,
      };

      if (input.taskId) {
        getArtifactStore().put({
          taskId: input.taskId,
          kind: "research",
          producerAgentId: "research",
          data: result,
        });
      }

      if (findings.length === 0 && notes.some((n) => n.startsWith("search_failed"))) {
        return {
          outcome: AgentOutcome.PARTIAL,
          data: result,
          error: { code: "RESEARCH_SOFT_FAIL", message: "Web research returned no findings" },
        };
      }

      return { outcome: AgentOutcome.SUCCESS, data: result };
    } catch (err: unknown) {
      return {
        outcome: AgentOutcome.FAILED,
        error: {
          code: "RESEARCH_ERROR",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};
