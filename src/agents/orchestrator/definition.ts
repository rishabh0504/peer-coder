import { AgentCategory, type AgentDefinition } from "../domain/agent_definition.js";
import { orchestratorInputSchema, orchestratorOutputSchema } from "./schema.js";

export const orchestratorDefinition: AgentDefinition = {
  id: "orchestrator",
  name: "Orchestrator",
  version: "1.0.0",
  aliases: ["orch", "supervisor"],
  description:
    "Deterministic workflow router. Dispatch only — no coding tools. Task Manager owns tasks.",
  category: AgentCategory.SYSTEM,
  status: "stable",
  capabilities: [
    {
      name: "orchestrate",
      inputType: "OrchestratorInput",
      outputType: "OrchestratorResult",
    },
  ],
  allowedTools: [],
  dependencies: [],
  inputSchema: orchestratorInputSchema,
  outputSchema: orchestratorOutputSchema,
  runtime: {
    timeoutMs: 600_000,
    maxIterations: 1,
    memoryPolicy: { enabled: true, namespace: "orchestrator" },
    retryPolicy: { maxRetries: 2, backoff: "fixed" },
  },
};
