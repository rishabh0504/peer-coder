export type ExecutionEventType =
  | "agent.started" | "agent.completed" | "agent.failed" | "agent.cancelled"
  | "llm.request" | "llm.response"
  | "tool.started" | "tool.completed" | "tool.failed"
  | "memory.read" | "memory.write"
  | "error";

export interface ExecutionEvent {
  id: string;
  executionId: string;
  traceId: string;         // OTel-compatible: root trace
  spanId: string;          // OTel-compatible: this event's span
  parentEventId?: string;  // for nested agent/tool call trees
  type: ExecutionEventType;
  timestamp: string;
  payload?: unknown;
}

export interface EventStore {
  saveEvent(event: ExecutionEvent): Promise<void>;
  listEvents(executionId: string): Promise<ExecutionEvent[]>;
  listByTrace(traceId: string): Promise<ExecutionEvent[]>;
  clear(): Promise<void>;
}

export class MemoryEventStore implements EventStore {
  private events: ExecutionEvent[] = [];

  async saveEvent(event: ExecutionEvent) { this.events.push(event); }
  async listEvents(executionId: string) {
    return this.events.filter((e) => e.executionId === executionId);
  }
  async listByTrace(traceId: string) {
    return this.events.filter((e) => e.traceId === traceId);
  }
  async clear() { this.events = []; }
}
