import type { z } from "zod";
import {
  codeIntelResultSchema,
  debugResultSchema,
  implementationResultSchema,
  orchestratorResultSchema,
  planResultSchema,
  repositoryProfileSchema,
  researchResultSchema,
  verificationResultSchema,
} from "../contracts/index.js";

export type ArtifactKind =
  | "repository_profile"
  | "code_intel"
  | "research"
  | "plan"
  | "implementation"
  | "verification"
  | "orchestrator"
  | "debug";

export interface ArtifactEnvelope<T = unknown> {
  id: string;
  taskId: string;
  kind: ArtifactKind;
  createdAt: string;
  producerAgentId: string;
  schemaVersion: number;
  data: T;
}

export const ARTIFACT_SCHEMAS: Record<ArtifactKind, z.ZodType> = {
  repository_profile: repositoryProfileSchema,
  code_intel: codeIntelResultSchema,
  research: researchResultSchema,
  plan: planResultSchema,
  implementation: implementationResultSchema,
  verification: verificationResultSchema,
  orchestrator: orchestratorResultSchema,
  debug: debugResultSchema,
};

export const ARTIFACT_SCHEMA_VERSION = 1;
