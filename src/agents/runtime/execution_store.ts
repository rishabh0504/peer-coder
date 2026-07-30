export interface AgentExecutionRecord {
  executionId: string;
  agentId: string;
  agentVersion: string;
  sessionId: string;
  traceId: string;
  parentExecutionId?: string;
  resolvedDependencies?: Record<string, string>; // version snapshot
  startedAt: string;
  completedAt?: string;
  status: "running" | "success" | "partial" | "failed" | "cancelled" | "blocked";
  durationMs?: number;
  model?: string;
  tokensUsed?: number;
  toolsUsed: string[];
  error?: string;
}

export interface ExecutionStore {
  save(record: AgentExecutionRecord): Promise<void>;
  update(id: string, patch: Partial<AgentExecutionRecord>): Promise<void>;
  find(id: string): Promise<AgentExecutionRecord | null>;
  list(filter?: { agentId?: string; sessionId?: string; status?: string }): Promise<AgentExecutionRecord[]>;
  clear(): Promise<void>;
}

export class MemoryExecutionStore implements ExecutionStore {
  private records = new Map<string, AgentExecutionRecord>();

  async save(r: AgentExecutionRecord) { this.records.set(r.executionId, r); }
  async update(id: string, patch: Partial<AgentExecutionRecord>) {
    const r = this.records.get(id);
    if (r) this.records.set(id, { ...r, ...patch });
  }
  async find(id: string) { return this.records.get(id) ?? null; }
  async list(filter?: { agentId?: string; sessionId?: string; status?: string }) {
    let list = Array.from(this.records.values());
    if (filter?.agentId) list = list.filter((r) => r.agentId === filter.agentId);
    if (filter?.sessionId) list = list.filter((r) => r.sessionId === filter.sessionId);
    if (filter?.status) list = list.filter((r) => r.status === filter.status);
    return list;
  }
  async clear() { this.records.clear(); }
}
