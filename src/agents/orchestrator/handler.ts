import type { InMemoryMemoryManager } from "../../memory/memory_manager.js";
import { getExecutionJournal, getTaskManager } from "../../orchestration/index.js";
import { getWorkspaceGraph } from "../../workspace/graph/index.js";
import { getArtifactStore } from "../artifacts/index.js";
import type {
  CodeIntelResult,
  OrchestratorResult,
  PlanResult,
  RepositoryProfile,
  ResearchResult,
  VerificationResult,
} from "../contracts/index.js";
import type { AgentExecutionResult, AgentResult } from "../core/agent_result.js";
import { AgentOutcome } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import { agentRegistry } from "../registry/agent_registry.js";
import { agentRuntime } from "../runtime/instance.js";
import { classifyWorkflow, looksLikeKnowledgeGap, shouldRunResearch } from "./router.js";
import type { OrchestratorInput, WorkflowId } from "./schema.js";

function agentRegistered(id: string): boolean {
  try {
    agentRegistry.get(id);
    return true;
  } catch {
    return false;
  }
}

async function dispatchChild(
  agentId: string,
  input: unknown,
  context: AgentExecutionContext,
): Promise<AgentExecutionResult> {
  const handle = agentRuntime.execute(
    agentId,
    input,
    {
      sessionId: context.sessionId,
      container: context.container,
      metadata: {
        ...context.metadata,
        parentAgent: "orchestrator",
        useToolLoop: agentId === "implementation" || agentId === "research",
      },
    },
    { parentExecutionId: context.executionId, traceId: context.traceId },
  );
  return handle.result();
}

function profileFromWiData(data: unknown, workspacePath: string): RepositoryProfile {
  const d = data as {
    workspaceContext?: Record<string, unknown>;
    summary?: string;
  };
  const wc = d.workspaceContext ?? {};
  return {
    workspaceRoot: workspacePath,
    projectName: wc.projectName as string | undefined,
    languages: (wc.languages as string[]) ?? [],
    frameworks: (wc.frameworks as string[]) ?? [],
    runtimes: (wc.runtimes as string[]) ?? [],
    packageManager: wc.packageManager as string | undefined,
    testFrameworks: (wc.testFrameworks as string[]) ?? [],
    importantFiles: (wc.importantFiles as string[]) ?? [],
    summary: d.summary,
  };
}

export const orchestratorHandler: AgentHandler = {
  async execute(state: unknown, context: AgentExecutionContext): Promise<AgentResult> {
    const input = state as OrchestratorInput;
    const mm = context.container.memoryManager as InMemoryMemoryManager | undefined;
    if (!mm) {
      return {
        outcome: AgentOutcome.BLOCKED,
        error: { code: "NO_MEMORY", message: "MemoryManager required for orchestration." },
      };
    }

    const tm = getTaskManager(mm);
    const journal = getExecutionJournal();
    const artifacts = getArtifactStore();
    const graph = getWorkspaceGraph();
    const steps: OrchestratorResult["steps"] = [];
    const notes: string[] = [];
    let researchUsed = false;
    let verification: VerificationResult | undefined;
    let blockedOn: string | undefined;

    const workflow: WorkflowId = input.forceWorkflow ?? classifyWorkflow(input.userRequest);
    let task = input.taskId ? await tm.getTask(input.taskId) : null;
    if (!task) {
      task = await tm.createTask({
        workspacePath: input.workspacePath,
        goal: input.userRequest,
        userRequest: input.userRequest,
        taskId: input.taskId,
      });
    }
    const taskId = task.id;

    const finish = (outcome: AgentOutcome): AgentResult => {
      const data: OrchestratorResult = {
        workflowId: workflow,
        taskId,
        steps,
        blockedOn,
        researchUsed,
        verification,
        notes,
      };
      artifacts.put({
        taskId,
        kind: "orchestrator",
        producerAgentId: "orchestrator",
        data,
      });
      return { outcome, data };
    };

    const record = async (
      agentId: string,
      outcome: string,
      summary: string,
      artifactIds: string[] = [],
      durationMs?: number,
      error?: { code: string; message: string },
      note?: string,
    ) => {
      steps.push({ agentId, outcome, summary, artifactIds, durationMs });
      journal.append({
        taskId,
        executionId: context.executionId,
        agentId,
        outcome,
        artifactIds,
        durationMs,
        error,
        note,
      });
      for (const id of artifactIds) await tm.attachArtifact(taskId, id);
    };

    const requireAgent = async (id: string): Promise<boolean> => {
      if (agentRegistered(id)) return true;
      blockedOn = id;
      await record(id, AgentOutcome.PARTIAL, `Agent ${id} not registered`, [], undefined, {
        code: "MISSING_AGENT",
        message: `blockedOn:${id}`,
      });
      return false;
    };

    try {
      if (workflow === "status_query") {
        const open = await tm.listOpen(input.workspacePath);
        const events = journal.listByTask(taskId);
        notes.push(...open.map((t) => `${t.id}: ${t.goal} [${t.status}]`));
        await record(
          "task_manager",
          AgentOutcome.SUCCESS,
          `${open.length} open; ${events.length} events`,
        );
        return finish(AgentOutcome.SUCCESS);
      }

      if (workflow === "research_only") {
        if (!(await requireAgent("research"))) return finish(AgentOutcome.PARTIAL);
        researchUsed = true;
        const res = await dispatchChild(
          "research",
          { workspacePath: input.workspacePath, query: input.userRequest, taskId },
          context,
        );
        const art = artifacts.latestByKind(taskId, "research");
        await record(
          "research",
          res.outcome,
          "Research completed",
          art ? [art.id] : [],
          res.execution?.durationMs,
          res.error,
        );
        return finish(
          res.outcome === AgentOutcome.SUCCESS ? AgentOutcome.SUCCESS : AgentOutcome.PARTIAL,
        );
      }

      if (!(await requireAgent("workspace_intelligence"))) return finish(AgentOutcome.PARTIAL);
      const wi = await dispatchChild(
        "workspace_intelligence",
        { workspacePath: input.workspacePath, sessionId: context.sessionId },
        context,
      );
      if (wi.outcome === AgentOutcome.BLOCKED || wi.outcome === AgentOutcome.FAILED) {
        await record("workspace_intelligence", wi.outcome, "WI stopped", [], undefined, wi.error);
        return finish(wi.outcome);
      }
      const profile = profileFromWiData(wi.data, input.workspacePath);
      await graph.setRepositoryProfile(input.workspacePath, profile);
      await mm?.seedRepositoryProfile?.(input.workspacePath, profile);
      const profileArt = artifacts.put({
        taskId,
        kind: "repository_profile",
        producerAgentId: "workspace_intelligence",
        data: profile,
      });
      await record(
        "workspace_intelligence",
        wi.outcome,
        "Repository profile ready",
        [profileArt.id],
        wi.execution?.durationMs,
      );

      if (workflow === "workspace_analyze") return finish(AgentOutcome.SUCCESS);

      await graph.ensureIndexed(input.workspacePath);

      if (!(await requireAgent("code_intelligence"))) return finish(AgentOutcome.PARTIAL);
      const ci = await dispatchChild(
        "code_intelligence",
        { workspacePath: input.workspacePath, query: input.userRequest },
        context,
      );
      if (ci.outcome === AgentOutcome.FAILED || ci.outcome === AgentOutcome.BLOCKED) {
        await record("code_intelligence", ci.outcome, "Code intel failed", [], undefined, ci.error);
        return finish(ci.outcome);
      }
      const ciData = ci.data as CodeIntelResult;
      const ciArt = artifacts.put({
        taskId,
        kind: "code_intel",
        producerAgentId: "code_intelligence",
        data: ciData,
      });
      await record(
        "code_intelligence",
        ci.outcome,
        (ciData.summary ?? "indexed").slice(0, 120),
        [ciArt.id],
        ci.execution?.durationMs,
      );

      const codeIntelWeak =
        (ciData.symbols?.length ?? 0) === 0 && (ciData.impactedPaths?.length ?? 0) === 0;

      if (shouldRunResearch({ userRequest: input.userRequest, codeIntelWeak })) {
        if (!(await requireAgent("research"))) return finish(AgentOutcome.PARTIAL);
        researchUsed = true;
        const rr = await dispatchChild(
          "research",
          { workspacePath: input.workspacePath, query: input.userRequest, taskId },
          context,
        );
        const rArt = artifacts.latestByKind<ResearchResult>(taskId, "research");
        await record(
          "research",
          rr.outcome,
          "Research gate",
          rArt ? [rArt.id] : [],
          rr.execution?.durationMs,
          rr.error,
        );
        if (rr.outcome === AgentOutcome.BLOCKED) {
          blockedOn = "research";
          return finish(AgentOutcome.BLOCKED);
        }
      }

      if (!(await requireAgent("planning"))) return finish(AgentOutcome.PARTIAL);
      const planRes = await dispatchChild(
        "planning",
        {
          workspacePath: input.workspacePath,
          userRequest: input.userRequest,
          taskId,
          codeIntel: ciData,
          artifactIds: tm.getArtifactIds(taskId),
        },
        context,
      );
      if (planRes.outcome === AgentOutcome.FAILED || planRes.outcome === AgentOutcome.BLOCKED) {
        await record("planning", planRes.outcome, "Planning failed", [], undefined, planRes.error);
        return finish(planRes.outcome);
      }
      const plan = planRes.data as PlanResult;
      const planArt =
        artifacts.latestByKind(taskId, "plan") ??
        artifacts.put({
          taskId,
          kind: "plan",
          producerAgentId: "planning",
          data: plan,
        });
      await record("planning", planRes.outcome, plan.goal.slice(0, 120), [planArt.id]);

      if (!(await requireAgent("implementation"))) return finish(AgentOutcome.PARTIAL);

      const runImpl = async (note?: string) => {
        const impl = await dispatchChild(
          "implementation",
          {
            workspacePath: input.workspacePath,
            taskId,
            artifactIds: tm.getArtifactIds(taskId),
          },
          context,
        );
        const iArt = artifacts.latestByKind(taskId, "implementation");
        await record(
          "implementation",
          impl.outcome,
          "Implementation step",
          iArt ? [iArt.id] : [],
          impl.execution?.durationMs,
          impl.error,
          note,
        );
        return impl;
      };

      let impl = await runImpl();
      if (
        (impl.error?.code === "NEED_RESEARCH" || impl.outcome === AgentOutcome.RETRY) &&
        !journal.hasImplResearchRetry(taskId)
      ) {
        if (await requireAgent("research")) {
          researchUsed = true;
          await dispatchChild(
            "research",
            { workspacePath: input.workspacePath, query: input.userRequest, taskId },
            context,
          );
          impl = await runImpl("research_retry");
        }
      }
      if (impl.outcome === AgentOutcome.BLOCKED) return finish(AgentOutcome.BLOCKED);
      if (impl.outcome === AgentOutcome.FAILED && impl.error?.code !== "NEED_RESEARCH") {
        return finish(AgentOutcome.FAILED);
      }

      if (!(await requireAgent("verification"))) return finish(AgentOutcome.PARTIAL);
      let verify = await dispatchChild(
        "verification",
        { workspacePath: input.workspacePath, taskId },
        context,
      );
      verification = verify.data as VerificationResult | undefined;
      const vArt =
        artifacts.latestByKind(taskId, "verification") ??
        (verification
          ? artifacts.put({
              taskId,
              kind: "verification",
              producerAgentId: "verification",
              data: verification,
            })
          : null);
      await record(
        "verification",
        verify.outcome,
        verification?.passed ? "passed" : "failed",
        vArt ? [vArt.id] : [],
        verify.execution?.durationMs,
        verify.error,
      );

      if (verify.outcome === AgentOutcome.PARTIAL && verification && !verification.passed) {
        if (
          looksLikeKnowledgeGap(verification.failures) &&
          !journal.hasImplResearchRetry(taskId) &&
          (await requireAgent("research"))
        ) {
          researchUsed = true;
          await dispatchChild(
            "research",
            {
              workspacePath: input.workspacePath,
              query: `${input.userRequest} ${verification.failures.map((f) => f.message).join(" ")}`,
              taskId,
            },
            context,
          );
          impl = await runImpl("research_retry");
          verify = await dispatchChild(
            "verification",
            { workspacePath: input.workspacePath, taskId },
            context,
          );
          verification = verify.data as VerificationResult | undefined;
          await record(
            "verification",
            verify.outcome,
            "re-verify after research",
            [],
            verify.execution?.durationMs,
            verify.error,
          );
        } else if (!journal.hasDebugRetry(taskId) && (await requireAgent("debugging"))) {
          const dbg = await dispatchChild(
            "debugging",
            {
              workspacePath: input.workspacePath,
              taskId,
              verification,
              artifactIds: tm.getArtifactIds(taskId),
            },
            context,
          );
          const dArt = artifacts.latestByKind(taskId, "debug");
          await record(
            "debugging",
            dbg.outcome,
            "Diagnose verification failures",
            dArt ? [dArt.id] : [],
            dbg.execution?.durationMs,
            dbg.error,
            "debug_retry",
          );
          if (dbg.outcome === AgentOutcome.SUCCESS) {
            impl = await runImpl("debug_retry");
            verify = await dispatchChild(
              "verification",
              { workspacePath: input.workspacePath, taskId },
              context,
            );
            verification = verify.data as VerificationResult | undefined;
            await record(
              "verification",
              verify.outcome,
              "re-verify after debug",
              [],
              verify.execution?.durationMs,
              verify.error,
            );
          }
        }
      }

      if (verify.outcome === AgentOutcome.SUCCESS && verification?.passed) {
        await tm.close(taskId, "done", input.workspacePath);
        return finish(AgentOutcome.SUCCESS);
      }

      notes.push("Verification did not fully pass");
      return finish(AgentOutcome.PARTIAL);
    } catch (err: unknown) {
      return {
        outcome: AgentOutcome.FAILED,
        error: {
          code: "ORCHESTRATOR_ERROR",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};
