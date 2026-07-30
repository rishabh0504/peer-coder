import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { parseToolCall } from "@utils/tool-parser.js";
import type { ToolService } from "../core/execution_context.js";

export type ToolLoopStopReason =
  | "final"
  | "max_iterations"
  | "timeout"
  | "cancelled"
  | "error"
  | "need_research";

export interface ToolLoopResult {
  finalText: string;
  toolsUsed: string[];
  iterations: number;
  stopReason: ToolLoopStopReason;
  error?: string;
}

export interface ToolLoopLlm {
  /** Stream or invoke returning assistant text + optional tool calls */
  invoke(messages: BaseMessage[]): Promise<{
    content: string;
    toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  }>;
}

export interface AgentToolLoopOptions {
  llm: ToolLoopLlm;
  tools: ToolService;
  systemPrompt: string;
  userPrompt: string;
  maxIterations?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Optional: restrict which tool names may run */
  allowedToolNames?: string[];
  onStep?: (info: { iteration: number; toolName?: string }) => void;
}

/**
 * Multi-turn ReAct tool loop for Implementation / Research.
 * Enforces maxIterations and timeout; policy is expected on tools.execute already.
 */
export async function runAgentToolLoop(opts: AgentToolLoopOptions): Promise<ToolLoopResult> {
  const maxIterations = opts.maxIterations ?? 12;
  const timeoutMs = opts.timeoutMs ?? 300_000;
  const started = Date.now();
  const toolsUsed: string[] = [];
  const messages: BaseMessage[] = [
    new SystemMessage(opts.systemPrompt),
    new HumanMessage(opts.userPrompt),
  ];

  let iterations = 0;
  let finalText = "";

  try {
    while (iterations < maxIterations) {
      if (opts.signal?.aborted) {
        return { finalText, toolsUsed, iterations, stopReason: "cancelled" };
      }
      if (Date.now() - started > timeoutMs) {
        return { finalText, toolsUsed, iterations, stopReason: "timeout" };
      }

      iterations++;
      opts.onStep?.({ iteration: iterations });

      const response = await opts.llm.invoke(messages);
      const toolCalls = response.toolCalls ?? [];

      if (toolCalls.length === 0) {
        const parsed = parseToolCall(undefined, response.content);
        if (parsed) {
          toolCalls.push({
            id: parsed.id || `call_${Date.now()}`,
            name: parsed.name,
            args: (parsed.args ?? {}) as Record<string, unknown>,
          });
        }
      }

      if (toolCalls.length === 0) {
        finalText = response.content || finalText;
        if (/NEED_RESEARCH|need research|unknown API/i.test(finalText)) {
          return { finalText, toolsUsed, iterations, stopReason: "need_research" };
        }
        return { finalText, toolsUsed, iterations, stopReason: "final" };
      }

      messages.push(
        new AIMessage({
          content: response.content || "",
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            args: tc.args,
          })),
        }),
      );

      for (const tc of toolCalls) {
        if (opts.allowedToolNames && !opts.allowedToolNames.includes(tc.name)) {
          messages.push(
            new ToolMessage({
              tool_call_id: tc.id,
              content: JSON.stringify({ error: `Tool ${tc.name} not allowed` }),
            }),
          );
          continue;
        }
        opts.onStep?.({ iteration: iterations, toolName: tc.name });
        toolsUsed.push(tc.name);
        try {
          const result = await opts.tools.execute(tc.name, tc.args, { signal: opts.signal });
          messages.push(
            new ToolMessage({
              tool_call_id: tc.id,
              content:
                typeof result === "string" ? result : JSON.stringify(result).slice(0, 20_000),
            }),
          );
        } catch (err) {
          messages.push(
            new ToolMessage({
              tool_call_id: tc.id,
              content: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            }),
          );
        }
      }
    }

    return { finalText, toolsUsed, iterations, stopReason: "max_iterations" };
  } catch (err) {
    return {
      finalText,
      toolsUsed,
      iterations,
      stopReason: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Build a ToolLoopLlm from a LangChain-style chat model with bindTools. */
export function createToolLoopLlmFromBoundModel(boundModel: {
  invoke: (messages: BaseMessage[]) => Promise<{
    content?: unknown;
    tool_calls?: Array<{ id?: string; name: string; args?: Record<string, unknown> }>;
  }>;
}): ToolLoopLlm {
  return {
    async invoke(messages) {
      const res = await boundModel.invoke(messages);
      const content =
        typeof res.content === "string"
          ? res.content
          : Array.isArray(res.content)
            ? res.content.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join("")
            : String(res.content ?? "");
      const toolCalls = (res.tool_calls ?? []).map((tc, i) => ({
        id: tc.id || `call_${Date.now()}_${i}`,
        name: tc.name,
        args: (tc.args ?? {}) as Record<string, unknown>,
      }));
      return { content, toolCalls };
    },
  };
}

export function filterToolsByName(
  tools: StructuredToolInterface[],
  allowed: string[],
): StructuredToolInterface[] {
  const set = new Set(allowed);
  return tools.filter((t) => set.has(t.name));
}
