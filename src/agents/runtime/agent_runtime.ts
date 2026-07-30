import type { AgentRegistry } from "../registry/agent_registry.js";
import type { AgentHandlerRegistry } from "../handlers/handler_registry.js";
import type { AgentExecutionTracker } from "./execution_tracker.js";
import type { AgentLifecycleManager } from "../core/lifecycle.js";
import type { ToolPolicyEngine } from "../security/tool_policy.js";
import type { ToolRegistry } from "../domain/tool_definition.js";
import type { AgentMiddleware } from "./middleware.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentExecutionResult } from "../core/agent_result.js";
import { buildMiddlewareChain } from "./middleware.js";
import { createExecutionId, createTraceId } from "../../core/utils/id_generator.js";
import { AgentOutcome } from "../core/agent_result.js";

export interface AgentExecutionHandle {
  id: string;
  cancel(): void;
  result(): Promise<AgentExecutionResult>;
}

export class AgentRuntime {
  private middlewares: AgentMiddleware[] = [];

  constructor(
    private readonly registry: AgentRegistry,
    private readonly handlers: AgentHandlerRegistry,
    private readonly tracker: AgentExecutionTracker,
    private readonly lifecycle: AgentLifecycleManager,
    private readonly policy: ToolPolicyEngine,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  use(middleware: AgentMiddleware): void {
    this.middlewares.push(middleware);
  }

  execute(
    agentId: string,
    state: unknown,
    context: Omit<AgentExecutionContext, "executionId" | "signal" | "traceId">,
    options?: { parentExecutionId?: string; traceId?: string },
  ): AgentExecutionHandle {
    const definition = this.registry.get(agentId);
    this.lifecycle.canExecute(definition);

    const executionId = createExecutionId(agentId);
    const traceId = options?.traceId ?? createTraceId();
    const controller = new AbortController();

    // Race-free: execution starts in microtask queue AFTER handle is returned
    const resultPromise = Promise.resolve().then(() =>
      this.run(agentId, state, context, executionId, traceId, controller, options?.parentExecutionId),
    );

    return {
      id: executionId,
      cancel: () => controller.abort(),
      result: () => resultPromise,
    };
  }

  private async run(
    agentId: string,
    state: unknown,
    baseContext: Omit<AgentExecutionContext, "executionId" | "signal" | "traceId">,
    executionId: string,
    traceId: string,
    controller: AbortController,
    parentExecutionId?: string,
  ): Promise<AgentExecutionResult> {
    const definition = this.registry.get(agentId);
    const handler = this.handlers.get(agentId, definition.version);

    // Validate + transform input — use parsed.data (captures Zod defaults/transforms)
    let validatedState = state;
    if (definition.inputSchema) {
      const parsed = definition.inputSchema.safeParse(state);
      if (!parsed.success) {
        throw new Error(`Invalid input for "${agentId}": ${parsed.error.message}`);
      }
      validatedState = parsed.data;
    }

    // Session-scoped memory isolation: ${sessionId}/${namespace}/${key}
    const memNs = definition.runtime.memoryPolicy?.namespace ?? definition.id;
    const scopedMemory = {
      get: (key: string) => baseContext.container.memory.get(`${baseContext.sessionId}/${memNs}/${key}`),
      set: (key: string, val: unknown) => baseContext.container.memory.set(`${baseContext.sessionId}/${memNs}/${key}`, val),
      delete: (key: string) => baseContext.container.memory.delete(`${baseContext.sessionId}/${memNs}/${key}`),
    };

    // Tool intercept: policy uses tool.requiredPermission, not hardcoded EXECUTE
    const scopedTools = {
      execute: async (toolName: string, args: unknown, opts?: { signal?: AbortSignal }) => {
        const toolDef = this.toolRegistry.get(toolName);
        if (!toolDef) throw new Error(`Tool "${toolName}" not found in ToolRegistry.`);

        this.policy.validate(definition, toolDef);

        await this.lifecycle.safeCall("beforeToolCall", () =>
          handler.hooks?.beforeToolCall?.(toolName, args) ?? Promise.resolve(),
        );
        await this.tracker.emitToolStarted(executionId, traceId, toolName, args);

        const result = await toolDef.execute(args, { signal: opts?.signal ?? controller.signal });

        await this.tracker.emitToolCompleted(executionId, traceId, toolName, result);
        await this.lifecycle.safeCall("afterToolCall", () =>
          handler.hooks?.afterToolCall?.(toolName, result) ?? Promise.resolve(),
        );

        return result;
      },
    };

    const fullContext: AgentExecutionContext = {
      ...baseContext,
      executionId,
      traceId,
      signal: controller.signal,
      container: {
        ...baseContext.container,
        tools: scopedTools,
        memory: scopedMemory,
        llm: baseContext.container.llm
          ? {
              generate: (prompt, opts) =>
                baseContext.container.llm!.generate(prompt, {
                  ...opts,
                  signal: opts?.signal ?? controller.signal,
                }),
            }
          : undefined,
      },
    };

    await this.tracker.startExecution(
      executionId, agentId, definition.version,
      baseContext.sessionId, traceId, parentExecutionId,
    );

    await this.lifecycle.safeCall("beforeExecute", () =>
      handler.hooks?.beforeExecute?.(fullContext) ?? Promise.resolve(),
    );

    const started = Date.now();

    try {
      const mwCtx = {
        agentId, agentVersion: definition.version,
        executionId, state: validatedState, context: fullContext, parentExecutionId,
      };

      const chain = buildMiddlewareChain(
        this.middlewares,
        () => handler.execute(validatedState, fullContext),
        mwCtx,
      );

      const result = await chain();

      if (definition.outputSchema && result.outcome === AgentOutcome.SUCCESS) {
        const parsed = definition.outputSchema.safeParse(result.data);
        if (!parsed.success) {
          throw new Error(`Invalid output from "${agentId}": ${parsed.error.message}`);
        }
      }

      await this.lifecycle.safeCall("afterExecute", () =>
        handler.hooks?.afterExecute?.(result) ?? Promise.resolve(),
      );

      const durationMs = Date.now() - started;
      await this.tracker.completeExecution(
        executionId, traceId, result.telemetry?.toolsUsed ?? [], durationMs,
        { model: result.telemetry?.model ?? (baseContext.metadata.model as string | undefined), tokensUsed: result.telemetry?.tokensUsed },
      );

      return { ...result, execution: { id: executionId, durationMs } };
    } catch (err: unknown) {
      const durationMs = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);

      await this.lifecycle.safeCall("onError", () =>
        err instanceof Error
          ? handler.hooks?.onError?.(err) ?? Promise.resolve()
          : Promise.resolve(),
      );

      if (controller.signal.aborted) {
        await this.tracker.cancelExecution(executionId, traceId, durationMs);
        return {
          outcome: AgentOutcome.CANCELLED,
          execution: { id: executionId, durationMs },
          error: { code: "CANCELLED", message: "Execution was cancelled." },
        };
      }

      await this.tracker.failExecution(executionId, traceId, message, durationMs);
      return {
        outcome: AgentOutcome.FAILED,
        execution: { id: executionId, durationMs },
        error: { code: "EXECUTION_ERROR", message },
      };
    }
  }
}
