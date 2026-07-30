export enum AgentOutcome {
  SUCCESS = "success",
  PARTIAL = "partial", // completed with partial results
  RETRY = "retry", // agent requests retry (not an error)
  BLOCKED = "blocked", // agent cannot proceed (missing creds, permissions)
  CANCELLED = "cancelled",
  FAILED = "failed",
}

// Returned by handlers — NO runtime/infrastructure data
export interface AgentResult<T = unknown> {
  outcome: AgentOutcome;
  data?: T;
  telemetry?: {
    model?: string;
    tokensUsed?: number;
    toolsUsed?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

// Returned by AgentRuntime.execute() — adds runtime wrapper
export interface AgentExecutionResult<T = unknown> extends AgentResult<T> {
  execution: {
    id: string;
    durationMs: number;
    resolvedDependencies?: Record<string, string>; // version snapshot
  };
}
