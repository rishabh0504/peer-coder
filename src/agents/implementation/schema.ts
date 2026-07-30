import { z } from "zod";
import { implementationResultSchema } from "../contracts/index.js";

export const implementationInputSchema = z.object({
  workspacePath: z.string(),
  taskId: z.string().min(1),
  stepId: z.string().optional(),
  sessionId: z.string().optional(),
  /** Optional explicit note/marker file for deterministic tests / dry scaffolding */
  scaffoldNote: z.string().optional(),
});

export const implementationOutputSchema = implementationResultSchema;

export type ImplementationInput = z.infer<typeof implementationInputSchema>;
