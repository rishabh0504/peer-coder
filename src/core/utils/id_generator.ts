import crypto from "node:crypto";

export function createExecutionId(agentId: string): string {
  return `${agentId}_${crypto.randomUUID()}`;
}

export function createTraceId(): string {
  return crypto.randomUUID();
}
