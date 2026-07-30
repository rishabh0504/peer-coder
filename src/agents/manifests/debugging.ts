import { debuggingDefinition } from "../debugging/definition.js";
import { debuggingHandler } from "../debugging/handler.js";
import type { AgentModule } from "./index.js";

export const debuggingModule: AgentModule = {
  agents: () => [{ definition: debuggingDefinition, handler: debuggingHandler }],
};
