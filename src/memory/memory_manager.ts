import { buildAgentPromptPack } from "./context/context_builder.js";
import type {
  AgentPromptPack,
  EpisodeType,
  ExecutionState,
  FileRecord,
  MemoryManager,
  PromotionEvent,
  RecallContext,
  SymbolEdge,
  SymbolRecord,
  TaskState,
} from "./domain/types.js";
import { MemoryPlanner } from "./planner/memory_planner.js";
import { L0ExecutionStore } from "./storage/l0_execution_store.js";
import { L1TaskStore } from "./storage/l1_task_store.js";
import { L2FactStore, L4EpisodeStore, L5PreferenceStore } from "./storage/l2_l4_l5_stores.js";
import { L3SymbolStore } from "./storage/l3_symbol_store.js";
import { shouldPromote } from "./storage/promotion_policy.js";
import { isSupabaseConfigured, syncRepositoryFact } from "./storage/supabase_sync.js";

export class InMemoryMemoryManager implements MemoryManager {
  readonly l0 = new L0ExecutionStore();
  readonly l1 = new L1TaskStore();
  readonly l2 = new L2FactStore();
  readonly l3 = new L3SymbolStore();
  readonly l4 = new L4EpisodeStore();
  readonly l5 = new L5PreferenceStore();
  readonly supabaseEnabled = isSupabaseConfigured();
  private readonly planner: MemoryPlanner;

  constructor() {
    this.planner = new MemoryPlanner(this.l0, this.l1, this.l3);
  }

  async planAndRecall(request: string, ctx: RecallContext): Promise<AgentPromptPack> {
    const needs = this.planner.extractNeeds(request);
    const hits = await this.planner.recall(needs, ctx);
    for (const f of this.l2.current(ctx.workspaceId)) {
      hits.facts.push({
        subject: f.subject,
        predicate: f.predicate,
        object: f.object,
      });
    }
    for (const p of this.l5.get(ctx.workspaceId)) {
      hits.preferences[p.key] = p.value;
    }
    for (const e of this.l4.list(ctx.workspaceId)) {
      hits.episodes.push({ type: e.type as EpisodeType, summary: e.summary });
    }
    return buildAgentPromptPack(hits);
  }

  getExecution(executionId: string): ExecutionState | null {
    return this.l0.get(executionId);
  }

  async getTask(taskId: string): Promise<TaskState | null> {
    return this.l1.get(taskId);
  }

  async createTask(
    input: Omit<TaskState, "id" | "createdAt" | "updatedAt" | "completed" | "remaining"> & {
      id?: string;
      completed?: string[];
      remaining?: string[];
    },
  ): Promise<TaskState> {
    return this.l1.create(input);
  }

  async updateTask(taskId: string, patch: Partial<TaskState>): Promise<TaskState | null> {
    return this.l1.update(taskId, patch);
  }

  updateExecution(executionId: string, patch: Partial<ExecutionState>): void {
    this.l0.update(executionId, patch);
  }

  bindExecution(state: ExecutionState): void {
    this.l0.set(state);
  }

  async promote(event: PromotionEvent): Promise<void> {
    if (event.type === "task_progress") {
      if (!shouldPromote("task_progress", 1)) return;
      this.l1.update(event.taskId, event.patch);
      return;
    }
    if (event.type === "file_indexed") {
      if (!shouldPromote("file_indexed", 1)) return;
      for (const f of event.files) this.l3.upsertFile(f);
      for (const s of event.symbols) this.l3.upsertSymbol(s);
      for (const e of event.edges) this.l3.upsertEdge(e);
    }
  }

  async seedRepositoryProfile(
    workspaceId: string,
    profile: {
      languages?: string[];
      packageManager?: string;
      frameworks?: string[];
      projectName?: string;
    },
  ): Promise<void> {
    const conf = 0.9;
    if (profile.projectName) {
      this.l2.upsert({
        workspaceId,
        subject: "repo",
        predicate: "projectName",
        object: profile.projectName,
        source: "analyzer",
        confidence: conf,
      });
    }
    if (profile.packageManager) {
      this.l2.upsert({
        workspaceId,
        subject: "repo",
        predicate: "packageManager",
        object: profile.packageManager,
        source: "analyzer",
        confidence: conf,
      });
      void syncRepositoryFact({
        workspaceId,
        subject: "repo",
        predicate: "packageManager",
        object: profile.packageManager,
        source: "analyzer",
        confidence: conf,
      });
    }
    if (profile.languages?.length) {
      this.l2.upsert({
        workspaceId,
        subject: "repo",
        predicate: "languages",
        object: profile.languages.join(","),
        source: "analyzer",
        confidence: conf,
      });
    }
    if (profile.frameworks?.length) {
      this.l2.upsert({
        workspaceId,
        subject: "repo",
        predicate: "frameworks",
        object: profile.frameworks.join(","),
        source: "analyzer",
        confidence: conf,
      });
    }
  }

  recordFailure(workspaceId: string, summary: string): void {
    if (!shouldPromote("episode_failure", 0.8)) return;
    this.l4.add({ workspaceId, type: "failure", summary });
  }

  setPreference(workspaceId: string, key: string, value: string): void {
    this.l5.set(workspaceId, key, value);
  }

  getL3Symbols(workspaceId: string, name?: string): SymbolRecord[] {
    return this.l3.findSymbols(workspaceId, name);
  }

  getL3Files(workspaceId: string, pathHint?: string): FileRecord[] {
    return this.l3.findFiles(workspaceId, pathHint);
  }

  indexGraph(files: FileRecord[], symbols: SymbolRecord[], edges: SymbolEdge[]): void {
    for (const f of files) this.l3.upsertFile(f);
    for (const s of symbols) this.l3.upsertSymbol(s);
    for (const e of edges) this.l3.upsertEdge(e);
  }
}

export function createMemoryManager(): InMemoryMemoryManager {
  return new InMemoryMemoryManager();
}
