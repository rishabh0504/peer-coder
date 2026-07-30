import { z } from "zod";
import { orchestratorResultSchema } from "../contracts/index.js";

export const orchestratorInputSchema = z.object({
  workspacePath: z.string(),
  userRequest: z.string().min(1),
  sessionId: z.string().optional(),
  taskId: z.string().optional(),
  forceWorkflow: z
    .enum(["workspace_analyze", "status_query", "research_only", "coding_change"])
    .optional(),
});

export const orchestratorOutputSchema = orchestratorResultSchema;

export type OrchestratorInput = z.infer<typeof orchestratorInputSchema>;
export type WorkflowId = NonNullable<OrchestratorInput["forceWorkflow"]>;
