import { codeIntelligenceDefinition } from "../code_intelligence/definition.js";
import { codeIntelligenceHandler } from "../code_intelligence/handler.js";
import type { AgentModule } from "./index.js";

export const codeIntelligenceModule: AgentModule = {
  agents: () => [{ definition: codeIntelligenceDefinition, handler: codeIntelligenceHandler }],
};
