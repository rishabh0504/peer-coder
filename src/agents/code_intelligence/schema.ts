import { z } from "zod";
import { codeIntelResultSchema } from "../contracts/index.js";

export const codeIntelInputSchema = z.object({
  workspacePath: z.string(),
  query: z.string().min(1),
  symbolHint: z.string().optional(),
  maxFiles: z.number().int().positive().optional(),
  sessionId: z.string().optional(),
});

export const codeIntelOutputSchema = codeIntelResultSchema;

export type CodeIntelInput = z.infer<typeof codeIntelInputSchema>;
