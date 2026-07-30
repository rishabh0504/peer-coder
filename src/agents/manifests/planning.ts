import { planningDefinition } from "../planning/definition.js";
import { planningHandler } from "../planning/handler.js";
import type { AgentModule } from "./index.js";

export const planningModule: AgentModule = {
  agents: () => [{ definition: planningDefinition, handler: planningHandler }],
};
