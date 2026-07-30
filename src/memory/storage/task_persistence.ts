import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TaskState } from "../domain/types.js";

export function taskStorePath(workspacePath: string, taskId: string): string {
  return path.join(workspacePath, ".peer-coder", "tasks", `${taskId}.json`);
}

export async function persistTask(workspacePath: string, task: TaskState): Promise<void> {
  const file = taskStorePath(workspacePath, task.id);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(task, null, 2), "utf8");
}

export async function loadPersistedTask(
  workspacePath: string,
  taskId: string,
): Promise<TaskState | null> {
  try {
    const raw = await readFile(taskStorePath(workspacePath, taskId), "utf8");
    return JSON.parse(raw) as TaskState;
  } catch {
    return null;
  }
}
