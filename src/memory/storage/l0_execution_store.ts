import type { ExecutionState } from "../domain/types.js";

export class L0ExecutionStore {
  private readonly store = new Map<string, ExecutionState>();

  get(executionId: string): ExecutionState | null {
    return this.store.get(executionId) ?? null;
  }

  set(state: ExecutionState): void {
    this.store.set(state.executionId, { ...state, updatedAt: new Date().toISOString() });
  }

  update(executionId: string, patch: Partial<ExecutionState>): ExecutionState | null {
    const current = this.store.get(executionId);
    if (!current) return null;
    const next: ExecutionState = {
      ...current,
      ...patch,
      executionId: current.executionId,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(executionId, next);
    return next;
  }

  delete(executionId: string): void {
    this.store.delete(executionId);
  }
}
