import { AgentCategory, type AgentDefinition } from "../domain/agent_definition.js";
import { planningInputSchema, planningOutputSchema } from "./schema.js";

export const planningDefinition: AgentDefinition = {
  id: "planning",
  name: "Planning Agent",
  version: "1.0.0",
  aliases: ["planner", "architect"],
  description: "Decomposes requirements into ordered implementation tasks (no file writes).",
  category: AgentCategory.REASONING,
  status: "stable",
  capabilities: [
    {
      name: "planning",
      inputType: "PlanningInput",
      outputType: "PlanResult",
    },
  ],
  allowedTools: [
    { name: "filesystem.read", permission: "read" },
    { name: "search_code", permission: "read" },
  ],
  dependencies: [],
  inputSchema: planningInputSchema,
  outputSchema: planningOutputSchema,
  runtime: {
    timeoutMs: 60_000,
    maxIterations: 3,
    memoryPolicy: { enabled: true, namespace: "planning" },
  },
};
