import { randomUUID } from "node:crypto";
import { getArtifactStore } from "../agents/artifacts/index.js";
import type { TaskState, TaskTodo } from "../memory/domain/types.js";
import type { InMemoryMemoryManager } from "../memory/memory_manager.js";
import { persistTask } from "../memory/storage/task_persistence.js";

export interface CreateTaskInput {
  workspacePath: string;
  goal: string;
  userRequest?: string;
  taskId?: string;
  acceptanceCriteria?: string[];
  testStrategy?: string[];
}

/**
 * Owns L1 task lifecycle. Orchestrator and Implementation call this —
 * they must not fork ad-hoc createTask paths.
 */
export class TaskManager {
  private artifactLinks = new Map<string, string[]>();

  constructor(private readonly memory: InMemoryMemoryManager) {}

  async createTask(input: CreateTaskInput): Promise<TaskState> {
    const task = await this.memory.createTask({
      id: input.taskId ?? randomUUID(),
      workspaceId: input.workspacePath,
      goal: input.goal,
      status: "active",
      todos: [],
      knownIssues: [],
      decisions: input.userRequest
        ? [{ summary: `User request: ${input.userRequest}`, at: new Date().toISOString() }]
        : [],
      filesTouched: [],
      architectureNotes: [],
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      testStrategy: input.testStrategy ?? [],
    });
    this.artifactLinks.set(task.id, []);
    await persistTask(input.workspacePath, task);
    return task;
  }

  async getTask(taskId: string): Promise<TaskState | null> {
    return this.memory.getTask(taskId);
  }

  async listOpen(workspacePath?: string): Promise<TaskState[]> {
    // L1 store has no list API — track via artifact links + get known ids
    const ids = [...this.artifactLinks.keys()];
    const tasks: TaskState[] = [];
    for (const id of ids) {
      const t = await this.memory.getTask(id);
      if (t && t.status === "active" && (!workspacePath || t.workspaceId === workspacePath)) {
        tasks.push(t);
      }
    }
    return tasks;
  }

  async attachArtifact(taskId: string, artifactId: string): Promise<void> {
    const list = this.artifactLinks.get(taskId) ?? [];
    if (!list.includes(artifactId)) list.push(artifactId);
    this.artifactLinks.set(taskId, list);
    const art = getArtifactStore().get(artifactId);
    if (art) {
      await this.memory.updateTask(taskId, {
        decisions: [
          ...((await this.memory.getTask(taskId))?.decisions ?? []),
          {
            summary: `Attached artifact ${art.kind}:${artifactId.slice(0, 8)}`,
            at: new Date().toISOString(),
          },
        ],
      });
    }
  }

  getArtifactIds(taskId: string): string[] {
    return [...(this.artifactLinks.get(taskId) ?? [])];
  }

  async updateTodos(taskId: string, todos: TaskTodo[]): Promise<TaskState | null> {
    return this.memory.updateTask(taskId, {
      todos,
      remaining: todos.filter((t) => !t.done).map((t) => t.id),
      completed: todos.filter((t) => t.done).map((t) => t.id),
    });
  }

  async markStepDone(taskId: string, stepId: string): Promise<TaskState | null> {
    const task = await this.memory.getTask(taskId);
    if (!task) return null;
    const todos = task.todos.map((t) => (t.id === stepId ? { ...t, done: true } : t));
    return this.updateTodos(taskId, todos);
  }

  async addFilesTouched(taskId: string, files: string[]): Promise<TaskState | null> {
    const task = await this.memory.getTask(taskId);
    if (!task) return null;
    return this.memory.updateTask(taskId, {
      filesTouched: [...new Set([...task.filesTouched, ...files])],
    });
  }

  async addDecision(taskId: string, summary: string): Promise<TaskState | null> {
    const task = await this.memory.getTask(taskId);
    if (!task) return null;
    return this.memory.updateTask(taskId, {
      decisions: [...task.decisions, { summary, at: new Date().toISOString() }],
    });
  }

  async close(
    taskId: string,
    status: "done" | "abandoned",
    workspacePath?: string,
  ): Promise<TaskState | null> {
    const updated = await this.memory.updateTask(taskId, { status });
    if (updated && workspacePath) await persistTask(workspacePath, updated);
    return updated;
  }

  async persist(workspacePath: string, taskId: string): Promise<void> {
    const task = await this.memory.getTask(taskId);
    if (task) await persistTask(workspacePath, task);
  }
}

const managers = new WeakMap<InMemoryMemoryManager, TaskManager>();

export function getTaskManager(memory: InMemoryMemoryManager): TaskManager {
  let tm = managers.get(memory);
  if (!tm) {
    tm = new TaskManager(memory);
    managers.set(memory, tm);
  }
  return tm;
}
