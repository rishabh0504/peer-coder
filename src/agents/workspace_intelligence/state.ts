import type { AgentState } from "@/agents/core/state.js";
import type { WorkspaceContext } from "../../workspace/context/workspace_context.js";

export interface AgentError {
  code: string;
  message: string;
  node: string;
  timestamp: string;
  retryable: boolean;
}

export interface WorkspaceAnalysis {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  testFrameworks: string[];
  runtimes: string[];
  structure: {
    sourceDirs: string[];
    testDirs: string[];
    importantFiles: string[];
  };
  git?: {
    isRepo: boolean;
    branch?: string;
    headCommit?: string;
    isDirty?: boolean;
  };
}

export interface WorkspaceGraphState extends AgentState {
  workspacePath: string;
  analysisResult?: WorkspaceAnalysis;
  workspaceContext?: WorkspaceContext;
  summary?: string;
  errors?: AgentError[];
  status: "running" | "completed" | "failed";
  includeSummary?: boolean;
  agentName?: string;
  executionMetadata?: {
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
  };
}
