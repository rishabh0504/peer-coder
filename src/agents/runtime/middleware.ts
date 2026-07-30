import type { AgentResult } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";

export interface AgentMiddlewareContext {
  agentId: string;
  agentVersion: string;
  executionId: string;
  state: unknown;
  context: AgentExecutionContext;
  parentExecutionId?: string;
}

export interface AgentMiddleware {
  priority: number; // higher = outer (runs first)
  execute(ctx: AgentMiddlewareContext, next: () => Promise<AgentResult>): Promise<AgentResult>;
}

/**
 * Builds middleware chain ordered by priority (descending).
 * Result: highest-priority middleware is the outermost wrapper.
 *
 * priority 100 ──► priority 80 ──► priority 60 ──► handler
 */
export function buildMiddlewareChain(
  middlewares: AgentMiddleware[],
  handler: () => Promise<AgentResult>,
  ctx: AgentMiddlewareContext,
): () => Promise<AgentResult> {
  const sorted = [...middlewares].sort((a, b) => b.priority - a.priority);
  return sorted.reduceRight((next, mw) => () => mw.execute(ctx, next), handler);
}
