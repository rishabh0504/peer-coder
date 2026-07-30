import { AgentCategory, type AgentDefinition } from "../domain/agent_definition.js";
import { codeIntelInputSchema, codeIntelOutputSchema } from "./schema.js";

export const codeIntelligenceDefinition: AgentDefinition = {
  id: "code_intelligence",
  name: "Code Intelligence Agent",
  version: "1.0.0",
  aliases: ["code_intel", "symbol_index"],
  description: "Indexes files/symbols/edges and answers code-structure queries.",
  category: AgentCategory.ANALYSIS,
  status: "stable",
  capabilities: [
    {
      name: "code-intelligence",
      inputType: "CodeIntelInput",
      outputType: "CodeIntelResult",
    },
  ],
  allowedTools: [
    { name: "filesystem.read", permission: "read" },
    { name: "filesystem.stat", permission: "read" },
    { name: "search_code", permission: "read" },
    { name: "find_symbol", permission: "read" },
    { name: "find_references", permission: "read" },
  ],
  dependencies: [],
  inputSchema: codeIntelInputSchema,
  outputSchema: codeIntelOutputSchema,
  runtime: {
    timeoutMs: 120_000,
    maxIterations: 5,
    memoryPolicy: { enabled: true, namespace: "code-intelligence" },
  },
};
