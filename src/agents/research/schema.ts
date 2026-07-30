import { z } from "zod";
import { researchResultSchema } from "../contracts/index.js";

export const researchInputSchema = z.object({
  workspacePath: z.string(),
  query: z.string().min(1),
  urls: z.array(z.string()).optional(),
  maxFetches: z.number().int().min(1).max(5).optional().default(3),
  taskId: z.string().optional(),
  sessionId: z.string().optional(),
});

export const researchOutputSchema = researchResultSchema;

export type ResearchInput = z.infer<typeof researchInputSchema>;
