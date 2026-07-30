import crypto from "node:crypto";
import picocolors from "picocolors";
import type { OrchestratorResult } from "../agents/contracts/index.js";
import { AgentOutcome } from "../agents/core/agent_result.js";
import { bootstrapAgentRegistry } from "../agents/manifests/index.js";
import { AgentContainerFactory } from "../agents/runtime/container_factory.js";
import { agentRuntime } from "../agents/runtime/instance.js";
import { startAgentSpinner, stopAgentSpinner } from "../core/utils/spinner.js";

export async function orchestrateCommand(
  workspacePath: string,
  userRequest: string,
  forceWorkflow?: "workspace_analyze" | "status_query" | "research_only" | "coding_change",
): Promise<void> {
  const sessionId = `cli_session_${crypto.randomUUID()}`;
  bootstrapAgentRegistry();
  const container = AgentContainerFactory.createForCLI(sessionId, workspacePath);

  startAgentSpinner("Thinking", userRequest);
  try {
    const handle = agentRuntime.execute(
      "orchestrator",
      { workspacePath, userRequest, forceWorkflow, sessionId },
      { sessionId, container, metadata: { useToolLoop: true } },
    );
    const result = await handle.result();
    const data = result.data as OrchestratorResult | undefined;
    if (result.outcome === AgentOutcome.SUCCESS || result.outcome === AgentOutcome.PARTIAL) {
      stopAgentSpinner(true, `Workflow ${data?.workflowId ?? "?"} → ${result.outcome}`);
      console.log(`\n${picocolors.bold("workflow:")} ${data?.workflowId}`);
      console.log(`${picocolors.bold("taskId:")} ${data?.taskId ?? "—"}`);
      if (data?.blockedOn) console.log(`${picocolors.yellow("blockedOn:")} ${data.blockedOn}`);
      for (const step of data?.steps ?? []) {
        console.log(`  - [${step.outcome}] ${step.agentId}: ${step.summary.slice(0, 100)}`);
      }
      for (const n of data?.notes ?? []) console.log(picocolors.dim(`  note: ${n}`));
      console.log();
    } else {
      const errMsg = result.error?.message || "Unknown error";
      stopAgentSpinner(false, errMsg);
      console.log(`\n${picocolors.red("✖")} ${errMsg}\n`);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    stopAgentSpinner(false, errMsg);
    console.log(`\n${picocolors.red("✖")} ${errMsg}\n`);
  }
}
