import { AgentCategory, type AgentDefinition } from "../domain/agent_definition.js";
import { implementationInputSchema, implementationOutputSchema } from "./schema.js";

export const implementationDefinition: AgentDefinition = {
  id: "implementation",
  name: "Implementation Agent",
  version: "1.0.0",
  aliases: ["implementer", "coder"],
  description: "Executes plan steps: create/patch files and update task memory.",
  category: AgentCategory.EXECUTION,
  status: "stable",
  capabilities: [
    {
      name: "implementation",
      inputType: "ImplementationInput",
      outputType: "ImplementationResult",
    },
  ],
  allowedTools: [
    { name: "filesystem.read", permission: "read" },
    { name: "filesystem.write", permission: "write" },
    { name: "create_file", permission: "write" },
    { name: "apply_patch", permission: "write" },
    { name: "delete_file", permission: "write" },
    { name: "execute_command", permission: "execute" },
    { name: "git_diff", permission: "read" },
  ],
  dependencies: [],
  inputSchema: implementationInputSchema,
  outputSchema: implementationOutputSchema,
  runtime: {
    timeoutMs: 300_000,
    maxIterations: 20,
    memoryPolicy: { enabled: true, namespace: "implementation" },
  },
};
