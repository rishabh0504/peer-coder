import type { AgentResult } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentLifecycleHooks } from "../core/lifecycle.js";

export interface AgentHandler<TState = unknown, TResult = unknown> {
  execute(state: TState, context: AgentExecutionContext): Promise<AgentResult<TResult>>;
  hooks?: AgentLifecycleHooks;
}

export class AgentHandlerRegistry {
  private readonly handlers = new Map<string, AgentHandler<any, any>>();

  private key(id: string, version: string) { return `${id}@${version}`; }

  register(id: string, version: string, handler: AgentHandler<any, any>): void {
    const k = this.key(id, version);
    if (this.handlers.has(k)) throw new Error(`Handler for "${k}" already registered.`);
    this.handlers.set(k, handler);
  }

  get<TState = unknown, TResult = unknown>(id: string, version: string): AgentHandler<TState, TResult> {
    const h = this.handlers.get(this.key(id, version));
    if (!h) throw new Error(`No handler for "${id}@${version}".`);
    return h as AgentHandler<TState, TResult>;
  }

  unregister(id: string, version: string): void {
    this.handlers.delete(this.key(id, version));
  }
}

export const agentHandlerRegistry = new AgentHandlerRegistry();
