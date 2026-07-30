import crypto from "node:crypto";
import picocolors from "picocolors";
import type { DebugResult, VerificationResult } from "../agents/contracts/index.js";
import { AgentOutcome } from "../agents/core/agent_result.js";
import { bootstrapAgentRegistry } from "../agents/manifests/index.js";
import { AgentContainerFactory } from "../agents/runtime/container_factory.js";
import { agentRuntime } from "../agents/runtime/instance.js";
import { startAgentSpinner, stopAgentSpinner } from "../core/utils/spinner.js";
import { createMemoryManager } from "../memory/index.js";
import { loadPersistedTask } from "../memory/storage/task_persistence.js";

export async function debugCommand(workspacePath: string, taskId: string): Promise<void> {
  const sessionId = `cli_session_${crypto.randomUUID()}`;
  bootstrapAgentRegistry();
  const container = AgentContainerFactory.createForCLI(sessionId, workspacePath);
  const mm = createMemoryManager();
  container.memoryManager = mm as never;
  const disk = await loadPersistedTask(workspacePath, taskId);
  if (disk) await mm.createTask({ ...disk, id: disk.id });

  const verification: VerificationResult = {
    passed: false,
    commandsRun: [],
    failures: [{ code: "MANUAL", message: "Manual debug request — inspect task failures" }],
    acceptance: [],
  };

  startAgentSpinner("Analyzing", `debug ${taskId}`);
  try {
    const handle = agentRuntime.execute(
      "debugging",
      { workspacePath, taskId, verification },
      { sessionId, container, metadata: {} },
    );
    const result = await handle.result();
    if (result.outcome === AgentOutcome.SUCCESS) {
      stopAgentSpinner(true, "Diagnosis ready.");
      const data = result.data as DebugResult;
      console.log(`\n${picocolors.bold("hypothesis:")} ${data.hypothesis}`);
      console.log(`${picocolors.bold("targets:")} ${data.targetFiles.join(", ") || "—"}`);
      console.log(`${picocolors.bold("fix:")} ${data.suggestedFixSummary}\n`);
    } else {
      stopAgentSpinner(false, result.error?.message || "debug failed");
    }
  } catch (err: unknown) {
    stopAgentSpinner(false, err instanceof Error ? err.message : String(err));
  }
}
