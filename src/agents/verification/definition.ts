import { AgentCategory, type AgentDefinition } from "../domain/agent_definition.js";
import { verificationInputSchema, verificationOutputSchema } from "./schema.js";

export const verificationDefinition: AgentDefinition = {
  id: "verification",
  name: "Verification Agent",
  version: "1.0.0",
  aliases: ["verify", "qa"],
  description: "Runs typecheck/lint/tests and reports structured verification results.",
  category: AgentCategory.VALIDATION,
  status: "stable",
  capabilities: [
    {
      name: "verification",
      inputType: "VerificationInput",
      outputType: "VerificationResult",
    },
  ],
  allowedTools: [
    { name: "execute_command", permission: "execute" },
    { name: "get_command_output", permission: "read" },
    { name: "git_diff", permission: "read" },
    { name: "filesystem.read", permission: "read" },
  ],
  dependencies: [],
  inputSchema: verificationInputSchema,
  outputSchema: verificationOutputSchema,
  runtime: {
    timeoutMs: 600_000,
    maxIterations: 10,
    memoryPolicy: { enabled: true, namespace: "verification" },
  },
};
