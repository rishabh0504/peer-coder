import { z } from "zod";
import { verificationResultSchema } from "../contracts/index.js";

export const verificationInputSchema = z.object({
  workspacePath: z.string(),
  taskId: z.string().optional(),
  commands: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
});

export const verificationOutputSchema = verificationResultSchema;

export type VerificationInput = z.infer<typeof verificationInputSchema>;
