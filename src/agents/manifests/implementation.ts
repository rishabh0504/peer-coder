import { implementationDefinition } from "../implementation/definition.js";
import { implementationHandler } from "../implementation/handler.js";
import type { AgentModule } from "./index.js";

export const implementationModule: AgentModule = {
  agents: () => [{ definition: implementationDefinition, handler: implementationHandler }],
};
