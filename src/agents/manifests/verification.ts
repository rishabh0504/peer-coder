import { verificationDefinition } from "../verification/definition.js";
import { verificationHandler } from "../verification/handler.js";
import type { AgentModule } from "./index.js";

export const verificationModule: AgentModule = {
  agents: () => [{ definition: verificationDefinition, handler: verificationHandler }],
};
