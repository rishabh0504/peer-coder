import type { ToolResponse } from "@core-types/response.js";
import { createErrorResponse, createSuccessResponse } from "@core-types/response.js";
import { defaultAuditLogger } from "@observability/audit_logger.js";
import { defaultPolicyEngine } from "@security/policy_engine.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/context/workspace_context.js";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { defaultWorkspaceLockManager } from "@workspace/context/workspace_lock.js";

export type ToolHandler<TArgs = Record<string, unknown>, TResult = unknown> = (
  context: WorkspaceContext,
  args: TArgs,
) => Promise<TResult>;

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
}

export class ToolRuntime {
  private defaultContext: WorkspaceContext;
  private defaultRetryConfig: RetryConfig;

  constructor(
    defaultContext: WorkspaceContext = createDefaultWorkspaceContext(),
    retryConfig: RetryConfig = { maxRetries: 2, initialDelayMs: 100, backoffFactor: 2 },
  ) {
    this.defaultContext = defaultContext;
    this.defaultRetryConfig = retryConfig;
  }

  public async execute<TArgs extends Record<string, unknown>, TResult>(
    toolName: string,
    args: TArgs,
    handler: ToolHandler<TArgs, TResult>,
    contextOverride?: WorkspaceContext,
    retryOverride?: Partial<RetryConfig>,
  ): Promise<ToolResponse<TResult>> {
    const context = contextOverride || this.defaultContext;
    const retryConfig: RetryConfig = { ...this.defaultRetryConfig, ...retryOverride };
    const startTime = Date.now();
    const rule = defaultPolicyEngine.getRule(toolName);

    // 1. Policy check
    try {
      defaultPolicyEngine.validatePolicy(context.permissions, toolName);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      defaultAuditLogger.log({
        sessionId: context.sessionId,
        toolName,
        args,
        durationMs: Date.now() - startTime,
        success: false,
        dangerLevel: rule.dangerLevel,
        error: errorMsg,
      });
      return createErrorResponse("POLICY_ERROR", errorMsg);
    }

    // 2. Concurrency Lock
    const lockPath = (args.path || args.filePath) as string | undefined;
    if (lockPath) {
      const acquired = defaultWorkspaceLockManager.acquireLock(lockPath);
      if (!acquired) {
        const errorMsg = `Lock Error: Path '${lockPath}' is currently locked by another operation.`;
        defaultAuditLogger.log({
          sessionId: context.sessionId,
          toolName,
          args,
          durationMs: Date.now() - startTime,
          success: false,
          dangerLevel: rule.dangerLevel,
          error: errorMsg,
        });
        return createErrorResponse("LOCK_ERROR", errorMsg);
      }
    }

    // 3. Execution with Retry Loop & Audit Logging
    let attempts = 0;
    let delay = retryConfig.initialDelayMs;
    let lastError: unknown = null;

    try {
      while (attempts <= retryConfig.maxRetries) {
        attempts++;
        try {
          const data = await handler(context, args);
          const durationMs = Date.now() - startTime;

          defaultAuditLogger.log({
            sessionId: context.sessionId,
            toolName,
            args,
            durationMs,
            success: true,
            dangerLevel: rule.dangerLevel,
          });

          return createSuccessResponse(data, { durationMs });
        } catch (err) {
          lastError = err;
          // Don't delay on final attempt
          if (attempts <= retryConfig.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= retryConfig.backoffFactor;
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);

      defaultAuditLogger.log({
        sessionId: context.sessionId,
        toolName,
        args,
        durationMs,
        success: false,
        dangerLevel: rule.dangerLevel,
        error: errorMsg,
      });

      return createErrorResponse("EXECUTION_ERROR", errorMsg);
    } finally {
      if (lockPath) {
        defaultWorkspaceLockManager.releaseLock(lockPath);
      }
    }
  }

  /**
   * Helper that throws ToolExecutionError if tool execution fails.
   */
  public async executeOrThrow<TArgs extends Record<string, unknown>, TResult>(
    toolName: string,
    args: TArgs,
    handler: ToolHandler<TArgs, TResult>,
    contextOverride?: WorkspaceContext,
  ): Promise<TResult> {
    const response = await this.execute(toolName, args, handler, contextOverride);
    if (!response.success || response.data === undefined) {
      throw new ToolExecutionError(
        response.error?.message || `Tool '${toolName}' failed to execute.`,
        toolName,
        response.error?.code || "EXECUTION_ERROR",
      );
    }
    return response.data;
  }
}

export const defaultToolRuntime = new ToolRuntime();
