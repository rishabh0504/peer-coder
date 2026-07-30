import crypto from "node:crypto";
import picocolors from "picocolors";
import type { ImplementationResult } from "../agents/contracts/index.js";
import { AgentOutcome } from "../agents/core/agent_result.js";
import { bootstrapAgentRegistry } from "../agents/manifests/index.js";
import { AgentContainerFactory } from "../agents/runtime/container_factory.js";
import { agentRuntime } from "../agents/runtime/instance.js";
import { startAgentSpinner, stopAgentSpinner } from "../core/utils/spinner.js";

export async function implementCommand(
  workspacePath: string,
  taskId: string,
  stepId?: string,
): Promise<void> {
  const sessionId = `cli_session_${crypto.randomUUID()}`;
  bootstrapAgentRegistry();
  const container = AgentContainerFactory.createForCLI(sessionId, workspacePath);

  // Ensure task exists in this process memory by re-planning is caller's duty;
  // Implementation reads L1 from the same container instance.
  startAgentSpinner("Executing", taskId);
  try {
    const handle = agentRuntime.execute(
      "implementation",
      { workspacePath, taskId, stepId },
      { sessionId, container, metadata: {} },
    );
    const result = await handle.result();
    if (result.outcome === AgentOutcome.SUCCESS) {
      stopAgentSpinner(true, "Implementation step completed.");
      const data = result.data as ImplementationResult;
      console.log(`\n${picocolors.bold("taskId:")} ${data.taskId}`);
      console.log(`${picocolors.bold("changed:")} ${data.filesChanged.join(", ") || "(none)"}`);
      console.log(
        `${picocolors.bold("completed:")} ${data.completedStepIds.join(", ") || "(none)"}`,
      );
      console.log(`${data.diffSummary}\n`);
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
