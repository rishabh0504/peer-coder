import type { ToolResponse } from "@core-types/response.js";
import { createErrorResponse, createSuccessResponse } from "@core-types/response.js";
import { defaultAuditLogger } from "@observability/audit_logger.js";
import { defaultPolicyEngine } from "@security/policy_engine.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { defaultWorkspaceLockManager } from "@workspace/workspace_lock.js";

export type ToolHandler<TArgs = Record<string, unknown>, TResult = unknown> = (
  context: WorkspaceContext,
  args: TArgs,
) => Promise<TResult>;

export class ToolRuntime {
  private defaultContext: WorkspaceContext;

  constructor(defaultContext: WorkspaceContext = createDefaultWorkspaceContext()) {
    this.defaultContext = defaultContext;
  }

  public async execute<TArgs extends Record<string, unknown>, TResult>(
    toolName: string,
    args: TArgs,
    handler: ToolHandler<TArgs, TResult>,
    contextOverride?: WorkspaceContext,
  ): Promise<ToolResponse<TResult>> {
    const context = contextOverride || this.defaultContext;
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

    // 3. Execution & Audit Logging
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
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

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
}

export const defaultToolRuntime = new ToolRuntime();
