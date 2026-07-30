import type { AgentRegistry } from "../registry/agent_registry.js";
import type { AgentHandlerRegistry } from "../handlers/handler_registry.js";

export type AgentHealthStatus = "healthy" | "missing-handler" | "missing-tools" | "invalid-schema";

export interface AgentHealth {
  agentId: string;
  version: string;
  status: AgentHealthStatus;
  issues: string[];
}

export function checkAgentHealth(
  registry: AgentRegistry,
  handlers: AgentHandlerRegistry,
): AgentHealth[] {
  return registry.list().map((def) => {
    const issues: string[] = [];

    // Check handler exists
    try {
      handlers.get(def.id, def.version);
    } catch {
      issues.push(`No handler registered for "${def.id}@${def.version}"`);
    }

    // Check schema validity (basic)
    if (def.inputSchema && typeof def.inputSchema.safeParse !== "function") {
      issues.push("inputSchema is not a valid Zod schema");
    }

    return {
      agentId: def.id,
      version: def.version,
      status: issues.length === 0 ? "healthy" : "missing-handler",
      issues,
    };
  });
}
