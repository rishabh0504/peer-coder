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
  generate(prompt: string, options?: { signal?: AbortSignal; [key: string]: unknown }): Promise<string>;
}

export interface AgentContainer {
  tools: ToolService;
  memory: MemoryService;
  workspace?: WorkspaceService;
  llm?: LLMService;
}

export interface AgentExecutionContext {
  sessionId: string;
  executionId: string;   // for child span emission
  traceId: string;       // OTel-style trace root
  container: AgentContainer;
  metadata: { model?: string; [key: string]: unknown };
  signal: AbortSignal;   // always present — runtime provides one
}
