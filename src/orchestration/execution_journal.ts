export interface JournalEvent {
  at: string;
  taskId: string;
  executionId: string;
  agentId: string;
  outcome: string;
  artifactIds?: string[];
  error?: { code: string; message: string };
  durationMs?: number;
  note?: string;
}

export class ExecutionJournal {
  private events: JournalEvent[] = [];

  append(event: Omit<JournalEvent, "at"> & { at?: string }): JournalEvent {
    const full: JournalEvent = {
      ...event,
      at: event.at ?? new Date().toISOString(),
    };
    this.events.push(full);
    return full;
  }

  listByTask(taskId: string): JournalEvent[] {
    return this.events.filter((e) => e.taskId === taskId);
  }

  last(taskId: string, agentId?: string): JournalEvent | null {
    const list = this.listByTask(taskId).filter((e) => !agentId || e.agentId === agentId);
    return list.length ? (list[list.length - 1] ?? null) : null;
  }

  countRetries(taskId: string, agentId: string): number {
    return this.listByTask(taskId).filter(
      (e) => e.agentId === agentId && (e.note === "retry" || e.outcome === "retry"),
    ).length;
  }

  hasImplResearchRetry(taskId: string): boolean {
    return this.listByTask(taskId).some(
      (e) => e.agentId === "implementation" && e.note === "research_retry",
    );
  }

  hasDebugRetry(taskId: string): boolean {
    return this.listByTask(taskId).some(
      (e) => e.agentId === "debugging" || e.note === "debug_retry",
    );
  }

  all(): JournalEvent[] {
    return [...this.events];
  }
}

let singleton: ExecutionJournal | null = null;

export function getExecutionJournal(): ExecutionJournal {
  if (!singleton) singleton = new ExecutionJournal();
  return singleton;
}

export function resetExecutionJournalForTests(): void {
  singleton = new ExecutionJournal();
}
