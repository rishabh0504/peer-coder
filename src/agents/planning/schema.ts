import { z } from "zod";
import { codeIntelResultSchema, planResultSchema } from "../contracts/index.js";

export const planningInputSchema = z.object({
  workspacePath: z.string(),
  userRequest: z.string().min(1),
  codeIntel: codeIntelResultSchema.optional(),
  taskId: z.string().optional(),
  sessionId: z.string().optional(),
});

export const planningOutputSchema = planResultSchema;

export type PlanningInput = z.infer<typeof planningInputSchema>;
