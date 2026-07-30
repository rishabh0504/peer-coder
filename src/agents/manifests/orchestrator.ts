import { orchestratorDefinition } from "../orchestrator/definition.js";
import { orchestratorHandler } from "../orchestrator/handler.js";
import type { AgentModule } from "./index.js";

export const orchestratorModule: AgentModule = {
  agents: () => [{ definition: orchestratorDefinition, handler: orchestratorHandler }],
};
