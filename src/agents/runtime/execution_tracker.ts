import crypto from "node:crypto";
import type { ExecutionStore } from "./execution_store.js";
import type { EventStore, ExecutionEventType } from "./event_store.js";

export class AgentExecutionTracker {
  constructor(
    private readonly execStore: ExecutionStore,
    private readonly eventStore: EventStore,
  ) {}

  async startExecution(
    executionId: string, agentId: string, agentVersion: string,
    sessionId: string, traceId: string, parentExecutionId?: string,
    resolvedDependencies?: Record<string, string>,
  ): Promise<void> {
    await this.execStore.save({
      executionId, agentId, agentVersion, sessionId, traceId,
      parentExecutionId, resolvedDependencies,
      startedAt: new Date().toISOString(), status: "running", toolsUsed: [],
    });
    await this.emit(executionId, traceId, "agent.started", { agentId, sessionId, parentExecutionId });
  }

  async completeExecution(executionId: string, traceId: string, toolsUsed: string[], durationMs: number, meta?: { model?: string; tokensUsed?: number }): Promise<void> {
    await this.execStore.update(executionId, {
      completedAt: new Date().toISOString(), status: "success",
      toolsUsed, durationMs, model: meta?.model, tokensUsed: meta?.tokensUsed,
    });
    await this.emit(executionId, traceId, "agent.completed", { toolsUsed, durationMs, meta });
  }

  async failExecution(executionId: string, traceId: string, error: string, durationMs: number): Promise<void> {
    await this.execStore.update(executionId, { completedAt: new Date().toISOString(), status: "failed", error, durationMs });
    await this.emit(executionId, traceId, "agent.failed", { error, durationMs });
  }

  async cancelExecution(executionId: string, traceId: string, durationMs: number): Promise<void> {
    await this.execStore.update(executionId, { completedAt: new Date().toISOString(), status: "cancelled", durationMs });
    await this.emit(executionId, traceId, "agent.cancelled", { durationMs });
  }

  async emitToolStarted(executionId: string, traceId: string, toolName: string, args: unknown): Promise<void> {
    await this.emit(executionId, traceId, "tool.started", { toolName, args });
  }

  async emitToolCompleted(executionId: string, traceId: string, toolName: string, result: unknown): Promise<void> {
    await this.emit(executionId, traceId, "tool.completed", { toolName, result });
  }

  private async emit(executionId: string, traceId: string, type: ExecutionEventType, payload?: unknown): Promise<void> {
    await this.eventStore.saveEvent({
      id: crypto.randomUUID(), executionId, traceId,
      spanId: crypto.randomUUID(),
      type, timestamp: new Date().toISOString(), payload,
    });
  }
}
