import type { ZodTypeAny } from "zod";

export enum AgentCategory {
  ANALYSIS = "analysis",
  REASONING = "reasoning",
  EXECUTION = "execution",
  VALIDATION = "validation",
  RECOVERY = "recovery",
  SYSTEM = "system",
}

export type AgentStatus = "experimental" | "stable" | "deprecated" | "disabled";

export interface AgentCapabilityContract {
  name: string;
  inputType: string; // e.g. "WorkspaceContext"
  outputType: string; // e.g. "WorkspaceGraph"
}

export interface AgentToolPermission {
  name: string; // glob: "filesystem.*", "git.read", "*"
  permission: string; // "read" | "write" | "execute" | "network"
}

export interface AgentDependency {
  agentId: string;
  versionRange: string; // semver range: "^1.0.0"
}

export interface AgentRuntimeConfig {
  timeoutMs?: number;
  maxIterations?: number;
  retryPolicy?: { maxRetries: number; backoff: "fixed" | "exponential" };
  memoryPolicy?: { enabled: boolean; namespace?: string };
  concurrency?: { maxParallelTasks: number };
}

export interface AgentDefinition {
  id: string;
  name: string;
  version: string; // semver: "1.2.0"
  aliases?: string[]; // alternate lookup names for LLM planners
  description: string;
  category: AgentCategory;
  status: AgentStatus;
  capabilities: AgentCapabilityContract[];
  allowedTools: AgentToolPermission[];
  dependencies: AgentDependency[];
  promptId?: string;
  inputSchema?: ZodTypeAny;
  outputSchema?: ZodTypeAny;
  runtime: AgentRuntimeConfig;
}

const VALID_STATUSES: AgentStatus[] = ["experimental", "stable", "deprecated", "disabled"];

export function validateAgentDefinition(def: AgentDefinition): void {
  for (const field of ["id", "name", "version", "description"] as const) {
    const val = def[field];
    if (!val || typeof val !== "string" || val.trim() === "") {
      throw new Error(`AgentDefinition: "${field}" must be a non-empty string.`);
    }
  }
  if (!Object.values(AgentCategory).includes(def.category)) {
    throw new Error(`AgentDefinition: invalid category "${def.category}".`);
  }
  if (!VALID_STATUSES.includes(def.status)) {
    throw new Error(`AgentDefinition: invalid status "${def.status}".`);
  }
  if (!Array.isArray(def.capabilities))
    throw new Error("AgentDefinition: capabilities must be an array.");
  if (!Array.isArray(def.allowedTools))
    throw new Error("AgentDefinition: allowedTools must be an array.");
  if (!Array.isArray(def.dependencies))
    throw new Error("AgentDefinition: dependencies must be an array.");
  if (!def.runtime || typeof def.runtime !== "object")
    throw new Error("AgentDefinition: runtime config required.");
}

/** Deep-freeze an AgentDefinition to prevent mutation after registration */
export function freezeDefinition(def: AgentDefinition): Readonly<AgentDefinition> {
  Object.freeze(def.capabilities);
  Object.freeze(def.allowedTools);
  Object.freeze(def.dependencies);
  Object.freeze(def.runtime);
  return Object.freeze(def);
}
