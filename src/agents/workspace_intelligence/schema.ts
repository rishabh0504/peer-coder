import { z } from "zod";

export const workspaceInputSchema = z.object({
  workspacePath: z.string(),
  sessionId: z.string().optional(),
  includeSummary: z.boolean().optional().default(false),
});

export const workspaceOutputSchema = z.object({
  workspaceContext: z.any().optional(),
  summary: z.string().optional(),
  status: z.enum(["running", "completed", "failed"]),
});
