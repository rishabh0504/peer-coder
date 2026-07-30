import { AgentDefinition } from "../domain/agent_definition.js";
import { AgentResult } from "./agent_result.js";
import { AgentExecutionContext } from "./execution_context.js";

export interface AgentLifecycleHooks {
  beforeExecute?(context: AgentExecutionContext): Promise<void>;
  afterExecute?(result: AgentResult): Promise<void>;
  onError?(error: Error): Promise<void>;
  beforeToolCall?(toolName: string, args: unknown): Promise<void>;
  afterToolCall?(toolName: string, result: unknown): Promise<void>;
}

export class AgentLifecycleManager {
  canExecute(definition: AgentDefinition): void {
    if (definition.status === "disabled") {
      throw new Error(`Agent "${definition.id}" is disabled.`);
    }
    if (definition.status === "deprecated") {
      console.warn(`[AgentRuntime] Agent "${definition.id}@${definition.version}" is deprecated.`);
    }
  }

  /** Call a lifecycle hook — errors are swallowed and logged, NOT propagated */
  async safeCall(hookName: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      console.error(`[AgentLifecycle] Hook "${hookName}" threw — ignoring:`, err);
    }
  }
}

export const agentLifecycleManager = new AgentLifecycleManager();
