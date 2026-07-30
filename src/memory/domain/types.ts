export type MemorySource = "user" | "analyzer" | "agent" | "inference";

export interface MemoryConfidence {
  source: MemorySource;
  confidence: number;
}

export interface PlanStep {
  id: string;
  title: string;
  status: "pending" | "active" | "done" | "skipped";
}

export interface ExecutionState {
  executionId: string;
  workspaceId: string;
  taskId?: string;
  goal: string;
  currentPlan: PlanStep[];
  visitedFiles: string[];
  activeErrors: string[];
  pendingActions: string[];
  currentToolResults: unknown[];
  updatedAt: string;
}

export interface TaskTodo {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskState {
  id: string;
  workspaceId: string;
  goal: string;
  status: "active" | "done" | "abandoned";
  todos: TaskTodo[];
  completed: string[];
  remaining: string[];
  knownIssues: string[];
  decisions: { summary: string; at: string }[];
  filesTouched: string[];
  architectureNotes: string[];
  acceptanceCriteria: string[];
  testStrategy: string[];
  createdAt: string;
  updatedAt: string;
}

export type EpisodeType = "decision" | "failure" | "solution" | "architecture_change" | "lesson";

export type MemoryNeed =
  | { kind: "execution" }
  | { kind: "task" }
  | { kind: "file"; pathHint?: string; textHint?: string }
  | { kind: "symbol"; name?: string }
  | { kind: "repo_fact"; subject?: string; predicate?: string }
  | { kind: "preference"; key?: string }
  | { kind: "experience"; episodeTypes?: EpisodeType[] }
  | { kind: "unknown" };

export interface RecallContext {
  workspaceId: string;
  executionId: string;
  taskId?: string;
  sessionId?: string;
}

export interface SystemMemoryContext {
  repository: Record<string, string>;
  user: Record<string, string>;
  architectureRules: string[];
}

export interface FileRecord {
  id: string;
  workspaceId: string;
  path: string;
  language?: string;
  sizeBytes: number;
  contentHash: string;
  lastIndexedAt: string;
}

export interface SymbolRecord {
  id: string;
  workspaceId: string;
  fileId: string;
  name: string;
  kind: string;
  filePath: string;
  startLine: number;
  endLine: number;
  exported: boolean;
  signature?: string;
}

export type SymbolRelation =
  | "imports"
  | "calls"
  | "extends"
  | "implements"
  | "references"
  | "exports";

export interface SymbolEdge {
  id: string;
  workspaceId: string;
  fromSymbolId: string;
  toSymbolId: string;
  fromName: string;
  toName: string;
  relation: SymbolRelation;
}

export interface TaskMemoryContext {
  execution?: ExecutionState;
  task?: TaskState;
  files: FileRecord[];
  symbols: SymbolRecord[];
  recentDecisions: string[];
  recentFailures: string[];
  episodes: { type: EpisodeType; summary: string }[];
}

export interface AgentPromptPack {
  systemMemory: SystemMemoryContext;
  taskMemory: TaskMemoryContext;
}

export interface LayerHits {
  execution?: ExecutionState;
  task?: TaskState;
  files: FileRecord[];
  symbols: SymbolRecord[];
  facts: { subject: string; predicate: string; object: string }[];
  preferences: Record<string, string>;
  episodes: { type: EpisodeType; summary: string }[];
}

export interface LayeredBudget {
  execution: number;
  task: number;
  repository: number;
  symbols: number;
  semantic: number;
  user: number;
}

export const DEFAULT_LAYER_BUDGET: LayeredBudget = {
  execution: 3000,
  task: 2000,
  repository: 1000,
  symbols: 3000,
  semantic: 4000,
  user: 200,
};

export type PromotionEvent =
  | { type: "task_progress"; taskId: string; patch: Partial<TaskState> }
  | { type: "file_indexed"; files: FileRecord[]; symbols: SymbolRecord[]; edges: SymbolEdge[] }
  | { type: "discard_transient" };

export interface MemoryManager {
  planAndRecall(request: string, ctx: RecallContext): Promise<AgentPromptPack>;
  getExecution(executionId: string): ExecutionState | null;
  getTask(taskId: string): Promise<TaskState | null>;
  createTask(
    input: Omit<TaskState, "id" | "createdAt" | "updatedAt" | "completed" | "remaining"> & {
      id?: string;
      completed?: string[];
      remaining?: string[];
    },
  ): Promise<TaskState>;
  updateTask(taskId: string, patch: Partial<TaskState>): Promise<TaskState | null>;
  updateExecution(executionId: string, patch: Partial<ExecutionState>): void;
  bindExecution(state: ExecutionState): void;
  promote(event: PromotionEvent): Promise<void>;
  getL3Symbols(workspaceId: string, name?: string): SymbolRecord[];
  getL3Files(workspaceId: string, pathHint?: string): FileRecord[];
  seedRepositoryProfile?(
    workspaceId: string,
    profile: {
      languages?: string[];
      packageManager?: string;
      frameworks?: string[];
      projectName?: string;
    },
  ): Promise<void>;
}
