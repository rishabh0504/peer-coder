import { AgentCategory, type AgentDefinition } from "../domain/agent_definition.js";
import { debuggingInputSchema, debuggingOutputSchema } from "./schema.js";

export const debuggingDefinition: AgentDefinition = {
  id: "debugging",
  name: "Debugging Agent",
  version: "1.0.0",
  aliases: ["debugger", "diagnose"],
  description:
    "Diagnoses verification failures. Does not write files — Implementation applies fixes.",
  category: AgentCategory.RECOVERY,
  status: "stable",
  capabilities: [
    {
      name: "debugging",
      inputType: "DebuggingInput",
      outputType: "DebugResult",
    },
  ],
  allowedTools: [
    { name: "read_file", permission: "read" },
    { name: "list_files", permission: "read" },
    { name: "search_code", permission: "read" },
    { name: "find_symbol", permission: "read" },
  ],
  dependencies: [],
  inputSchema: debuggingInputSchema,
  outputSchema: debuggingOutputSchema,
  runtime: {
    timeoutMs: 120_000,
    maxIterations: 8,
    memoryPolicy: { enabled: true, namespace: "debugging" },
  },
};
