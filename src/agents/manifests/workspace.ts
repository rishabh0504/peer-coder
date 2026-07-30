import { workspaceIntelligenceDefinition } from "../workspace_intelligence/definition.js";
import { workspaceIntelligenceHandler } from "../workspace_intelligence/handler.js";
import type { AgentModule } from "./index.js";

export const workspaceModule: AgentModule = {
  agents: () => [
    { definition: workspaceIntelligenceDefinition, handler: workspaceIntelligenceHandler },
  ],
};
