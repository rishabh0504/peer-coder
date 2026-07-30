import type { LayerHits, MemoryNeed, RecallContext } from "../domain/types.js";
import type { L0ExecutionStore } from "../storage/l0_execution_store.js";
import type { L1TaskStore } from "../storage/l1_task_store.js";
import type { L3SymbolStore } from "../storage/l3_symbol_store.js";
import { extractNeeds } from "./need_extractors.js";

export class MemoryPlanner {
  constructor(
    private readonly l0: L0ExecutionStore,
    private readonly l1: L1TaskStore,
    private readonly l3: L3SymbolStore,
  ) {}

  extractNeeds(request: string): MemoryNeed[] {
    return extractNeeds(request);
  }

  async recall(needs: MemoryNeed[], ctx: RecallContext): Promise<LayerHits> {
    const hits: LayerHits = {
      files: [],
      symbols: [],
      facts: [],
      preferences: {},
      episodes: [],
    };

    for (const need of needs) {
      switch (need.kind) {
        case "execution":
          hits.execution = this.l0.get(ctx.executionId) ?? undefined;
          break;
        case "task":
          if (ctx.taskId) {
            hits.task = this.l1.get(ctx.taskId) ?? undefined;
          }
          break;
        case "file":
          hits.files.push(...this.l3.findFiles(ctx.workspaceId, need.pathHint ?? need.textHint));
          break;
        case "symbol":
          hits.symbols.push(...this.l3.findSymbols(ctx.workspaceId, need.name));
          break;
        case "repo_fact":
        case "preference":
        case "experience":
        case "unknown":
          // L2/L4/L5 empty until Stage 2 adapters
          break;
      }
    }

    return hits;
  }
}
