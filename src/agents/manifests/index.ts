import { agentRegistry } from "../registry/agent_registry.js";
import { agentHandlerRegistry } from "../handlers/handler_registry.js";
import { capabilityRegistry } from "../registry/capability_registry.js";
import { checkAgentHealth } from "../runtime/health.js";
import type { AgentDefinition } from "../domain/agent_definition.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import { workspaceModule } from "./workspace.js";

export interface RegisteredAgent {
  definition: AgentDefinition;
  handler: AgentHandler<any, any>;
}

export interface AgentModule {
  agents(): RegisteredAgent[];
}

export function registerModule(module: AgentModule): void {
  for (const { definition, handler } of module.agents()) {
    agentRegistry.register(definition);
    agentHandlerRegistry.register(definition.id, definition.version, handler);
    capabilityRegistry.register(definition);
  }
}

let bootstrapped = false;

export function bootstrapAgentRegistry(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  registerModule(workspaceModule);

  // Health check at boot — warns about missing handlers/schemas
  const health = checkAgentHealth(agentRegistry, agentHandlerRegistry);
  for (const h of health) {
    if (h.status !== "healthy") {
      console.warn(`[Bootstrap] Agent "${h.agentId}@${h.version}" health issues:`, h.issues);
    }
  }
}
