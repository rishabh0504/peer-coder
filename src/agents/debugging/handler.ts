import type { InMemoryMemoryManager } from "../../memory/memory_manager.js";
import { createContextEngine } from "../../orchestration/context_engine.js";
import { getArtifactStore } from "../artifacts/index.js";
import type { DebugResult } from "../contracts/index.js";
import type { AgentResult } from "../core/agent_result.js";
import { AgentOutcome } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import type { DebuggingInput } from "./schema.js";

function extractFilesFromFailures(failures: Array<{ message: string; file?: string }>): string[] {
  const files = new Set<string>();
  for (const f of failures) {
    if (f.file) files.add(f.file);
    const m = f.message.match(/([^\s:]+\.[a-zA-Z0-9]+)/);
    if (m?.[1] && !m[1].includes("node_modules")) files.add(m[1]);
  }
  return [...files].slice(0, 10);
}

export const debuggingHandler: AgentHandler = {
  async execute(state: unknown, context: AgentExecutionContext): Promise<AgentResult> {
    try {
      const input = state as DebuggingInput;
      const mm = context.container.memoryManager as InMemoryMemoryManager | undefined;
      const ce = createContextEngine(mm);
      const pack = await ce.buildForAgent({
        agentId: "debugging",
        taskId: input.taskId,
        artifactIds: input.artifactIds,
        workspacePath: input.workspacePath,
        userRequest: input.verification.failures.map((f) => f.message).join("\n"),
      });

      const targetFiles = extractFilesFromFailures(input.verification.failures);
      const notes: string[] = [`failures:${input.verification.failures.length}`];

      // Optional read of top failure files for richer hypothesis
      for (const file of targetFiles.slice(0, 3)) {
        try {
          const raw = await context.container.tools.execute(
            "read_file",
            { path: file },
            { signal: context.signal },
          );
          notes.push(`read:${file}:${String(raw).slice(0, 80)}`);
        } catch {
          notes.push(`read_failed:${file}`);
        }
      }

      const top = input.verification.failures[0];
      const hypothesis =
        top?.message ?? "Verification failed without a clear primary error message.";
      const suggestedFixSummary = targetFiles.length
        ? `Inspect and fix: ${targetFiles.join(", ")}. Address: ${hypothesis.slice(0, 200)}`
        : `Re-run failing commands and fix reported errors: ${hypothesis.slice(0, 200)}`;

      const data: DebugResult = {
        hypothesis,
        targetFiles,
        suggestedFixSummary,
        notes: [...notes, `context_chars:${pack.promptText.length}`],
      };

      getArtifactStore().put({
        taskId: input.taskId,
        kind: "debug",
        producerAgentId: "debugging",
        data,
      });

      return { outcome: AgentOutcome.SUCCESS, data };
    } catch (err: unknown) {
      return {
        outcome: AgentOutcome.FAILED,
        error: {
          code: "DEBUGGING_ERROR",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};
