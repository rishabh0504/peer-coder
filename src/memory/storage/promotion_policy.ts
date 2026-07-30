/**
 * Promotion / TTL policy for memory layers (Stage 2).
 * Deterministic — no LLM classifier.
 */

export const TTL = {
  L1_TASK_MS: 30 * 24 * 60 * 60 * 1000,
  L2_FACT_MS: 180 * 24 * 60 * 60 * 1000,
  L4_FAILURE_MS: 90 * 24 * 60 * 60 * 1000,
  L5_PREF_MS: null as number | null, // forever
} as const;

export type PromotionKind =
  | "task_progress"
  | "repo_fact"
  | "episode_failure"
  | "preference"
  | "file_indexed";

export function shouldPromote(kind: PromotionKind, confidence: number): boolean {
  if (kind === "preference") return true;
  if (kind === "repo_fact") return confidence >= 0.6;
  if (kind === "episode_failure") return confidence >= 0.5;
  if (kind === "file_indexed") return true;
  if (kind === "task_progress") return true;
  return false;
}

export function expiresAt(kind: PromotionKind, from = Date.now()): string | undefined {
  if (kind === "preference") return undefined;
  if (kind === "episode_failure") return new Date(from + TTL.L4_FAILURE_MS).toISOString();
  if (kind === "repo_fact") return new Date(from + TTL.L2_FACT_MS).toISOString();
  if (kind === "task_progress") return new Date(from + TTL.L1_TASK_MS).toISOString();
  return undefined;
}
