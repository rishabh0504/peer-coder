export interface ToolService {
  execute(name: string, args: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
}

export interface MemoryService {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface WorkspaceService {
  getRoot(): string;
  readFile(path: string, options?: { signal?: AbortSignal }): Promise<string>;
}

export interface LLMService {
  generate(
    prompt: string,
    options?: { signal?: AbortSignal; [key: string]: unknown },
  ): Promise<string>;
}

/** Shared agent-state memory (L0–L5). See src/memory and docs/memory-lld.md */
export interface MemoryManagerPort {
  planAndRecall(
    request: string,
    ctx: {
      workspaceId: string;
      executionId: string;
      taskId?: string;
      sessionId?: string;
    },
  ): Promise<unknown>;
  getExecution(executionId: string): unknown;
  getTask(taskId: string): Promise<unknown>;
  createTask(input: unknown): Promise<unknown>;
  updateTask(taskId: string, patch: unknown): Promise<unknown>;
  updateExecution(executionId: string, patch: unknown): void;
  bindExecution(state: unknown): void;
  promote(event: unknown): Promise<void>;
  getL3Symbols(workspaceId: string, name?: string): unknown[];
  getL3Files(workspaceId: string, pathHint?: string): unknown[];
}

export interface AgentContainer {
  tools: ToolService;
  memory: MemoryService;
  /** Agent-state memory manager (optional until Stage 0 wired) */
  memoryManager?: MemoryManagerPort;
  workspace?: WorkspaceService;
  llm?: LLMService;
}

export interface AgentExecutionContext {
  sessionId: string;
  executionId: string; // for child span emission
  traceId: string; // OTel-style trace root
  container: AgentContainer;
  metadata: { model?: string; [key: string]: unknown };
  signal: AbortSignal; // always present — runtime provides one
}
