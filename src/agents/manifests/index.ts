import type { AgentDefinition } from "../domain/agent_definition.js";
import { agentHandlerRegistry } from "../handlers/handler_registry.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import { agentRegistry } from "../registry/agent_registry.js";
import { capabilityRegistry } from "../registry/capability_registry.js";
import { checkAgentHealth } from "../runtime/health.js";
import { codeIntelligenceModule } from "./code_intelligence.js";
import { debuggingModule } from "./debugging.js";
import { implementationModule } from "./implementation.js";
import { orchestratorModule } from "./orchestrator.js";
import { planningModule } from "./planning.js";
import { researchModule } from "./research.js";
import { verificationModule } from "./verification.js";
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
  registerModule(codeIntelligenceModule);
  registerModule(researchModule);
  registerModule(planningModule);
  registerModule(implementationModule);
  registerModule(verificationModule);
  registerModule(debuggingModule);
  registerModule(orchestratorModule);

  const health = checkAgentHealth(agentRegistry, agentHandlerRegistry);
  for (const h of health) {
    if (h.status !== "healthy") {
      console.warn(`[Bootstrap] Agent "${h.agentId}@${h.version}" health issues:`, h.issues);
    }
  }
}
