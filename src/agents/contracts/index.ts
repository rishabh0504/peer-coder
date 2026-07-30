import { z } from "zod";

export const codeIntelFileSchema = z.object({
  path: z.string(),
  language: z.string().optional(),
});

export const codeIntelSymbolSchema = z.object({
  name: z.string(),
  kind: z.string(),
  filePath: z.string(),
  startLine: z.number(),
  endLine: z.number(),
});

export const codeIntelEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  relation: z.string(),
});

export const codeIntelResultSchema = z.object({
  files: z.array(codeIntelFileSchema),
  symbols: z.array(codeIntelSymbolSchema),
  edges: z.array(codeIntelEdgeSchema),
  impactedPaths: z.array(z.string()),
  summary: z.string(),
});

export type CodeIntelResult = z.infer<typeof codeIntelResultSchema>;

export const repositoryProfileSchema = z.object({
  workspaceRoot: z.string(),
  projectName: z.string().optional(),
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  runtimes: z.array(z.string()).default([]),
  packageManager: z.string().optional(),
  testFrameworks: z.array(z.string()).default([]),
  importantFiles: z.array(z.string()).default([]),
  summary: z.string().optional(),
});

export type RepositoryProfile = z.infer<typeof repositoryProfileSchema>;

export const planTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  dependsOn: z.array(z.string()).default([]),
  filesLikely: z.array(z.string()).default([]),
});

export const planResultSchema = z.object({
  taskId: z.string(),
  goal: z.string(),
  tasks: z.array(planTaskSchema),
  order: z.array(z.string()),
  risks: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  testStrategy: z.array(z.string()),
});

export type PlanResult = z.infer<typeof planResultSchema>;

export const implementationResultSchema = z.object({
  taskId: z.string(),
  filesChanged: z.array(z.string()),
  diffSummary: z.string(),
  completedStepIds: z.array(z.string()),
  notes: z.array(z.string()),
  researchRequired: z.boolean().optional(),
});

export type ImplementationResult = z.infer<typeof implementationResultSchema>;

export const verificationResultSchema = z.object({
  passed: z.boolean(),
  commandsRun: z.array(
    z.object({
      cmd: z.string(),
      exitCode: z.number(),
      excerpt: z.string(),
    }),
  ),
  failures: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      file: z.string().optional(),
    }),
  ),
  acceptance: z.array(
    z.object({
      criterion: z.string(),
      met: z.boolean(),
    }),
  ),
});

export type VerificationResult = z.infer<typeof verificationResultSchema>;

export const researchFindingSchema = z.object({
  title: z.string(),
  url: z.string(),
  excerpt: z.string(),
});

export const researchResultSchema = z.object({
  query: z.string(),
  findings: z.array(researchFindingSchema),
  notes: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  researchRequired: z.boolean().optional(),
});

export type ResearchResult = z.infer<typeof researchResultSchema>;

export const orchestratorStepSchema = z.object({
  agentId: z.string(),
  outcome: z.string(),
  summary: z.string(),
  artifactIds: z.array(z.string()).default([]),
  durationMs: z.number().optional(),
});

export const orchestratorResultSchema = z.object({
  workflowId: z.string(),
  taskId: z.string().optional(),
  steps: z.array(orchestratorStepSchema),
  blockedOn: z.string().optional(),
  researchUsed: z.boolean().default(false),
  verification: verificationResultSchema.optional(),
  notes: z.array(z.string()).default([]),
});

export type OrchestratorResult = z.infer<typeof orchestratorResultSchema>;

export const debugResultSchema = z.object({
  hypothesis: z.string(),
  targetFiles: z.array(z.string()),
  suggestedFixSummary: z.string(),
  notes: z.array(z.string()),
});

export type DebugResult = z.infer<typeof debugResultSchema>;
