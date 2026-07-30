import { z } from "zod";
import { debugResultSchema, verificationResultSchema } from "../contracts/index.js";

export const debuggingInputSchema = z.object({
  workspacePath: z.string(),
  taskId: z.string(),
  verification: verificationResultSchema,
  artifactIds: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
});

export const debuggingOutputSchema = debugResultSchema;

export type DebuggingInput = z.infer<typeof debuggingInputSchema>;
