import type { AgentModule } from "./index.js";
import { workspaceIntelligenceDefinition } from "../workspace_intelligence/definition.js";
import { workspaceIntelligenceHandler } from "../workspace_intelligence/handler.js";

export const workspaceModule: AgentModule = {
  agents: () => [{ definition: workspaceIntelligenceDefinition, handler: workspaceIntelligenceHandler }],
};
