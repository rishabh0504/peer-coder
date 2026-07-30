import { researchDefinition } from "../research/definition.js";
import { researchHandler } from "../research/handler.js";
import type { AgentModule } from "./index.js";

export const researchModule: AgentModule = {
  agents: () => [{ definition: researchDefinition, handler: researchHandler }],
};
