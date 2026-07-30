import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  IMPLEMENTATION_TOOL_NAMES,
  createImplementationBoundLlm,
} from "../../integration/llms/agent_model.js";
import type { InMemoryMemoryManager } from "../../memory/memory_manager.js";
import { loadPersistedTask, persistTask } from "../../memory/storage/task_persistence.js";
import { createContextEngine } from "../../orchestration/context_engine.js";
import { getTaskManager } from "../../orchestration/task_manager.js";
import { getArtifactStore } from "../artifacts/index.js";
import type { ImplementationResult } from "../contracts/index.js";
import type { AgentResult } from "../core/agent_result.js";
import { AgentOutcome } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import { type ToolLoopLlm, runAgentToolLoop } from "../runtime/tool_loop.js";
import type { ImplementationInput } from "./schema.js";

const MUTATING_TOOLS = new Set(["create_file", "apply_patch", "delete_file"]);

function putImplArtifact(result: ImplementationResult): void {
  getArtifactStore().put({
    taskId: result.taskId,
    kind: "implementation",
    producerAgentId: "implementation",
    data: result,
  });
}

export const implementationHandler: AgentHandler = {
  async execute(state: unknown, context: AgentExecutionContext): Promise<AgentResult> {
    try {
      const input = state as ImplementationInput & { artifactIds?: string[] };
      const mm = context.container.memoryManager as InMemoryMemoryManager | undefined;
      if (!mm) {
        return {
          outcome: AgentOutcome.BLOCKED,
          error: { code: "NO_MEMORY", message: "MemoryManager required for implementation." },
        };
      }

      const tm = getTaskManager(mm);
      let task = await mm.getTask(input.taskId);
      if (!task) {
        const disk = await loadPersistedTask(input.workspacePath, input.taskId);
        if (disk) {
          await mm.createTask({ ...disk, id: disk.id });
          task = await mm.getTask(input.taskId);
        }
      }
      if (!task) {
        return {
          outcome: AgentOutcome.FAILED,
          error: {
            code: "TASK_NOT_FOUND",
            message: `Task ${input.taskId} not found in L1 or disk.`,
          },
        };
      }

      const stepId = input.stepId ?? task.todos.find((t) => !t.done)?.id;
      const filesChanged: string[] = [];
      const notes: string[] = [];
      const completedStepIds: string[] = [];

      const ce = createContextEngine(mm);
      const pack = await ce.buildForAgent({
        agentId: "implementation",
        taskId: input.taskId,
        artifactIds: input.artifactIds,
        workspacePath: input.workspacePath,
        userRequest: task.goal,
      });

      const extras = context.container as {
        toolLoopLlm?: ToolLoopLlm;
      };
      const forceScaffold =
        Boolean(input.scaffoldNote) || process.env.PEER_CODER_IMPL_SCAFFOLD === "1";
      const useLlm =
        !forceScaffold &&
        Boolean(
          extras.toolLoopLlm ||
            context.metadata?.useToolLoop === true ||
            process.env.PEER_CODER_IMPL_LLM === "1" ||
            context.container.llm,
        );

      if (useLlm) {
        const llm = extras.toolLoopLlm ?? createImplementationBoundLlm();
        const loop = await runAgentToolLoop({
          llm,
          tools: context.container.tools,
          systemPrompt: [
            "You are the Implementation agent. Edit the codebase to complete the active plan step.",
            "Use apply_patch / create_file / read_file / find_symbol as needed.",
            "If you lack external API knowledge, reply with NEED_RESEARCH and stop.",
            "Do not invent fake success — make real file changes.",
          ].join("\n"),
          userPrompt: [
            pack.promptText,
            `\nWorkspace: ${input.workspacePath}`,
            `\nActive step: ${stepId ?? "none"}`,
            `\nAcceptance: ${task.acceptanceCriteria.join("; ")}`,
          ].join("\n"),
          maxIterations: 20,
          timeoutMs: 300_000,
          signal: context.signal,
          allowedToolNames: [...IMPLEMENTATION_TOOL_NAMES],
        });
        notes.push(`tool_loop:${loop.stopReason}`, `iterations:${loop.iterations}`);
        notes.push(...loop.toolsUsed.map((t) => `tool:${t}`));
        if (loop.finalText) notes.push(loop.finalText.slice(0, 400));
        if (loop.error) notes.push(`error:${loop.error}`);

        const mutated = loop.toolsUsed.some((t) => MUTATING_TOOLS.has(t));
        if (mutated) {
          filesChanged.push("(via tools)");
          notes.push("File mutations via tools");
        }

        if (loop.stopReason === "need_research") {
          const result: ImplementationResult = {
            taskId: task.id,
            filesChanged,
            diffSummary: "Blocked on research",
            completedStepIds: [],
            notes,
            researchRequired: true,
          };
          putImplArtifact(result);
          return {
            outcome: AgentOutcome.RETRY,
            data: result,
            error: { code: "NEED_RESEARCH", message: loop.finalText || "Need external docs" },
          };
        }

        if (loop.stopReason === "error" || loop.stopReason === "cancelled") {
          const result: ImplementationResult = {
            taskId: task.id,
            filesChanged,
            diffSummary: `Failed: ${loop.stopReason}`,
            completedStepIds: [],
            notes,
          };
          putImplArtifact(result);
          return {
            outcome: AgentOutcome.FAILED,
            data: result,
            error: {
              code: loop.stopReason === "cancelled" ? "CANCELLED" : "IMPL_LOOP_ERROR",
              message: loop.error || loop.stopReason,
            },
          };
        }

        if (loop.stopReason === "max_iterations" || loop.stopReason === "timeout") {
          const result: ImplementationResult = {
            taskId: task.id,
            filesChanged,
            diffSummary: `Stopped: ${loop.stopReason}`,
            completedStepIds: [],
            notes,
          };
          putImplArtifact(result);
          return { outcome: AgentOutcome.PARTIAL, data: result };
        }

        // final — require mutation for implement-like steps
        const requiresMutation =
          !stepId || stepId === "implement" || /implement|code|write|fix|add|create/i.test(stepId);
        if (requiresMutation && !mutated) {
          const result: ImplementationResult = {
            taskId: task.id,
            filesChanged: [],
            diffSummary: "No file mutations",
            completedStepIds: [],
            notes,
          };
          putImplArtifact(result);
          return {
            outcome: AgentOutcome.PARTIAL,
            data: result,
            error: {
              code: "IMPL_NO_MUTATION",
              message: "Tool loop finished without create_file/apply_patch/delete_file",
            },
          };
        }
      } else {
        // Scaffold only for explicit tests
        const rel = `.peer-coder/tasks/${input.taskId}.md`;
        const abs = path.join(input.workspacePath, rel);
        await mkdir(path.dirname(abs), { recursive: true });
        const body =
          input.scaffoldNote ??
          [
            `# Task ${input.taskId}`,
            "",
            `Goal: ${task.goal}`,
            "",
            `Active step: ${stepId ?? "none"}`,
            "",
            "## Context artifacts",
            pack.promptText.slice(0, 2000),
            "",
            "## Todos",
            ...task.todos.map((t) => `- [${t.done ? "x" : " "}] ${t.id}: ${t.title}`),
            "",
          ].join("\n");
        await writeFile(abs, body, "utf8");
        filesChanged.push(rel);
        notes.push(`Wrote task scaffold ${rel}`);
      }

      if (stepId) {
        await tm.markStepDone(task.id, stepId);
        completedStepIds.push(stepId);
      }
      if (filesChanged.length) await tm.addFilesTouched(task.id, filesChanged);
      await tm.addDecision(task.id, `Implementation touched ${filesChanged.join(", ") || "none"}`);
      await tm.persist(input.workspacePath, task.id);

      const updated = await mm.getTask(task.id);
      if (updated) await persistTask(input.workspacePath, updated);

      mm.updateExecution(context.executionId, {
        visitedFiles: filesChanged,
        pendingActions: (updated?.todos ?? task.todos).filter((t) => !t.done).map((t) => t.title),
      });

      const result: ImplementationResult = {
        taskId: task.id,
        filesChanged,
        diffSummary: `Updated ${filesChanged.length} file(s): ${filesChanged.join(", ")}`,
        completedStepIds,
        notes,
      };
      putImplArtifact(result);
      return { outcome: AgentOutcome.SUCCESS, data: result };
    } catch (err: unknown) {
      return {
        outcome: AgentOutcome.FAILED,
        error: {
          code: "IMPLEMENTATION_ERROR",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};
