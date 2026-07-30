import { AgentCategory, type AgentDefinition } from "../domain/agent_definition.js";
import { workspaceInputSchema, workspaceOutputSchema } from "./schema.js";

export const workspaceIntelligenceDefinition: AgentDefinition = {
  id: "workspace_intelligence",
  name: "Workspace Intelligence Agent",
  version: "1.0.0",
  aliases: ["workspace_analyzer", "codebase_scanner"],
  description: "Analyzes workspace structure, languages, package managers, and runtimes.",
  category: AgentCategory.ANALYSIS,
  status: "stable",
  capabilities: [
    {
      name: "workspace-analysis",
      inputType: "WorkspaceInput",
      outputType: "WorkspaceGraph",
    },
  ],
  allowedTools: [
    { name: "filesystem.read", permission: "read" },
    { name: "filesystem.stat", permission: "read" },
    { name: "ollama.invoke", permission: "execute" },
  ],
  dependencies: [],
  inputSchema: workspaceInputSchema,
  outputSchema: workspaceOutputSchema,
  runtime: {
    timeoutMs: 30000,
    maxIterations: 5,
    memoryPolicy: {
      enabled: true,
      namespace: "workspace-analyzer",
    },
  },
};
