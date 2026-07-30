import { randomUUID } from "node:crypto";
import type { TaskState } from "../domain/types.js";

export class L1TaskStore {
  private readonly store = new Map<string, TaskState>();

  get(taskId: string): TaskState | null {
    return this.store.get(taskId) ?? null;
  }

  listByWorkspace(workspaceId: string): TaskState[] {
    return [...this.store.values()].filter((t) => t.workspaceId === workspaceId);
  }

  create(
    input: Omit<TaskState, "id" | "createdAt" | "updatedAt" | "completed" | "remaining"> & {
      id?: string;
      completed?: string[];
      remaining?: string[];
    },
  ): TaskState {
    const now = new Date().toISOString();
    const todos = input.todos ?? [];
    const completed = input.completed ?? todos.filter((t) => t.done).map((t) => t.id);
    const remaining = input.remaining ?? todos.filter((t) => !t.done).map((t) => t.id);
    const task: TaskState = {
      id: input.id ?? randomUUID(),
      workspaceId: input.workspaceId,
      goal: input.goal,
      status: input.status,
      todos,
      completed,
      remaining,
      knownIssues: input.knownIssues ?? [],
      decisions: input.decisions ?? [],
      filesTouched: input.filesTouched ?? [],
      architectureNotes: input.architectureNotes ?? [],
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      testStrategy: input.testStrategy ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(task.id, task);
    return task;
  }

  update(taskId: string, patch: Partial<TaskState>): TaskState | null {
    const current = this.store.get(taskId);
    if (!current) return null;
    const todos = patch.todos ?? current.todos;
    const next: TaskState = {
      ...current,
      ...patch,
      id: current.id,
      todos,
      completed: patch.completed ?? todos.filter((t) => t.done).map((t) => t.id),
      remaining: patch.remaining ?? todos.filter((t) => !t.done).map((t) => t.id),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(taskId, next);
    return next;
  }
}
