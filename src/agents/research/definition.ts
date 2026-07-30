import { AgentCategory, type AgentDefinition } from "../domain/agent_definition.js";
import { researchInputSchema, researchOutputSchema } from "./schema.js";

export const researchDefinition: AgentDefinition = {
  id: "research",
  name: "Research Agent",
  version: "1.0.0",
  aliases: ["researcher", "docs"],
  description: "External knowledge via web_search and fetch_webpage. No file writes.",
  category: AgentCategory.ANALYSIS,
  status: "stable",
  capabilities: [
    {
      name: "research",
      inputType: "ResearchInput",
      outputType: "ResearchResult",
    },
  ],
  allowedTools: [
    { name: "web_search", permission: "network" },
    { name: "fetch_webpage", permission: "network" },
  ],
  dependencies: [],
  inputSchema: researchInputSchema,
  outputSchema: researchOutputSchema,
  runtime: {
    timeoutMs: 120_000,
    maxIterations: 8,
    memoryPolicy: { enabled: true, namespace: "research" },
  },
};
