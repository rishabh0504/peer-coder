import type { InMemoryMemoryManager } from "../../memory/memory_manager.js";
import { getWorkspaceGraph } from "../../workspace/graph/index.js";
import type { AgentResult } from "../core/agent_result.js";
import { AgentOutcome } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import type { CodeIntelInput } from "./schema.js";

export const codeIntelligenceHandler: AgentHandler = {
  async execute(state: unknown, context: AgentExecutionContext): Promise<AgentResult> {
    try {
      const input = state as CodeIntelInput;
      const graph = getWorkspaceGraph();
      const indexed = await graph.searchCodeIntel(input.workspacePath, input.query);

      const mm = context.container.memoryManager as InMemoryMemoryManager | undefined;
      if (mm?.indexGraph) {
        const workspaceId = input.workspacePath;
        const fileRecords = indexed.files.map((f) =>
          mm.l3.upsertFile({
            workspaceId,
            path: f.path,
            language: f.language,
            sizeBytes: f.sizeBytes,
            contentHash: f.contentHash,
          }),
        );
        const fileIdByPath = new Map(fileRecords.map((f) => [f.path, f.id]));
        const symbolRecords = indexed.symbols.map((s) =>
          mm.l3.upsertSymbol({
            workspaceId,
            fileId: fileIdByPath.get(s.filePath) ?? s.filePath,
            name: s.name,
            kind: s.kind,
            filePath: s.filePath,
            startLine: s.startLine,
            endLine: s.endLine,
            exported: s.exported,
            signature: s.signature,
          }),
        );
        const byName = new Map(symbolRecords.map((s) => [s.name, s.id]));
        for (const e of indexed.edges) {
          const fromId = byName.get(e.from) ?? e.from;
          const toId = byName.get(e.to) ?? e.to;
          mm.l3.upsertEdge({
            workspaceId,
            fromSymbolId: String(fromId),
            toSymbolId: String(toId),
            fromName: e.from,
            toName: e.to,
            relation: e.relation,
          });
        }
        mm.updateExecution(context.executionId, {
          visitedFiles: indexed.impactedPaths.slice(0, 20),
        });
      }

      const langs = Object.keys(indexed.stats.byLanguage);
      return {
        outcome: AgentOutcome.SUCCESS,
        data: {
          files: indexed.files.map((f) => ({ path: f.path, language: f.language })),
          symbols: indexed.symbols.map((s) => ({
            name: s.name,
            kind: s.kind,
            filePath: s.filePath,
            startLine: s.startLine,
            endLine: s.endLine,
          })),
          edges: indexed.edges.map((e) => ({
            from: e.from,
            to: e.to,
            relation: e.relation,
          })),
          impactedPaths: indexed.impactedPaths,
          summary: `${indexed.summary} [languages: ${langs.join(", ") || "none"}; mode=${indexed.stats.mode}; ${indexed.stats.durationMs}ms]`,
        },
        telemetry: {
          toolsUsed: ["workspace_graph.search"],
        },
      };
    } catch (err: unknown) {
      return {
        outcome: AgentOutcome.FAILED,
        error: {
          code: "CODE_INTEL_ERROR",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};
