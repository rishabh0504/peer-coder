import { randomUUID } from "node:crypto";
import type { InMemoryMemoryManager } from "../../memory/memory_manager.js";
import { persistTask } from "../../memory/storage/task_persistence.js";
import { createContextEngine } from "../../orchestration/context_engine.js";
import { getTaskManager } from "../../orchestration/task_manager.js";
import { getArtifactStore } from "../artifacts/index.js";
import type {
  CodeIntelResult,
  PlanResult,
  RepositoryProfile,
  ResearchResult,
} from "../contracts/index.js";
import type { AgentResult } from "../core/agent_result.js";
import { AgentOutcome } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import type { PlanningInput } from "./schema.js";

function decompose(request: string, impacted: string[], languages: string[]): PlanResult["tasks"] {
  const base = request.replace(/^["']|["']$/g, "").trim();
  const filesLikely = impacted.slice(0, 5);
  const langNote = languages.length ? ` (${languages.slice(0, 3).join(", ")})` : "";
  return [
    {
      id: "discover",
      title: `Discover relevant code for: ${base}${langNote}`,
      dependsOn: [],
      filesLikely,
    },
    {
      id: "design",
      title: "Design approach and touch points",
      dependsOn: ["discover"],
      filesLikely,
    },
    { id: "implement", title: `Implement: ${base}`, dependsOn: ["design"], filesLikely },
    {
      id: "verify",
      title: "Verify with typecheck/tests",
      dependsOn: ["implement"],
      filesLikely: [],
    },
  ];
}

export const planningHandler: AgentHandler = {
  async execute(state: unknown, context: AgentExecutionContext): Promise<AgentResult> {
    try {
      const input = state as PlanningInput & { artifactIds?: string[] };
      const mm = context.container.memoryManager as InMemoryMemoryManager | undefined;
      const store = getArtifactStore();

      let codeIntel = input.codeIntel as CodeIntelResult | undefined;
      let profile: RepositoryProfile | undefined;
      let research: ResearchResult | undefined;

      if (input.taskId) {
        const ce = createContextEngine(mm);
        const pack = await ce.buildForAgent({
          agentId: "planning",
          taskId: input.taskId,
          artifactIds: input.artifactIds,
          workspacePath: input.workspacePath,
          userRequest: input.userRequest,
        });
        codeIntel = (pack.artifactSlice.code_intel as CodeIntelResult) ?? codeIntel;
        profile = pack.artifactSlice.repository_profile as RepositoryProfile | undefined;
        research = pack.artifactSlice.research as ResearchResult | undefined;
      }

      const impacted = codeIntel?.impactedPaths ?? codeIntel?.files.map((f) => f.path) ?? [];
      const languages = profile?.languages ?? [];
      const tasks = decompose(input.userRequest, impacted, languages);
      const order = tasks.map((t) => t.id);

      const risks = [
        impacted.length === 0
          ? "No code-intel context — plan may miss impacted files"
          : "Confirm impacted files before large refactors",
      ];
      if (research?.findings?.length) {
        risks.push(`External research available (${research.findings.length} findings)`);
      }

      const plan: PlanResult = {
        taskId: input.taskId ?? randomUUID(),
        goal: input.userRequest,
        tasks,
        order,
        risks,
        acceptanceCriteria: [
          `Requirement satisfied: ${input.userRequest}`,
          "Typecheck passes",
          "Existing tests still pass or are updated",
        ],
        testStrategy: ["pnpm typecheck", "pnpm test"],
      };

      if (mm) {
        const tm = getTaskManager(mm);
        const existing = input.taskId ? await mm.getTask(input.taskId) : null;
        if (existing) {
          await tm.updateTodos(
            existing.id,
            plan.tasks.map((t) => ({ id: t.id, title: t.title, done: false })),
          );
          await mm.updateTask(existing.id, {
            goal: plan.goal,
            acceptanceCriteria: plan.acceptanceCriteria,
            testStrategy: plan.testStrategy,
            architectureNotes: [`Order: ${plan.order.join(" → ")}`],
          });
          plan.taskId = existing.id;
          await tm.persist(input.workspacePath, existing.id);
        } else {
          const stored = await tm.createTask({
            workspacePath: input.workspacePath,
            goal: plan.goal,
            userRequest: input.userRequest,
            taskId: plan.taskId,
            acceptanceCriteria: plan.acceptanceCriteria,
            testStrategy: plan.testStrategy,
          });
          await tm.updateTodos(
            stored.id,
            plan.tasks.map((t) => ({ id: t.id, title: t.title, done: false })),
          );
          plan.taskId = stored.id;
          const saved = await mm.getTask(stored.id);
          if (saved) await persistTask(input.workspacePath, saved);
        }

        store.put({
          taskId: plan.taskId,
          kind: "plan",
          producerAgentId: "planning",
          data: plan,
        });
      }

      return { outcome: AgentOutcome.SUCCESS, data: plan };
    } catch (err: unknown) {
      return {
        outcome: AgentOutcome.FAILED,
        error: {
          code: "PLANNING_ERROR",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};
