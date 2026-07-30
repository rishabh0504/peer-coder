import crypto from "node:crypto";
import picocolors from "picocolors";
import type { PlanResult } from "../agents/contracts/index.js";
import { AgentOutcome } from "../agents/core/agent_result.js";
import { bootstrapAgentRegistry } from "../agents/manifests/index.js";
import { AgentContainerFactory } from "../agents/runtime/container_factory.js";
import { agentRuntime } from "../agents/runtime/instance.js";
import { startAgentSpinner, stopAgentSpinner } from "../core/utils/spinner.js";

export async function planCommand(workspacePath: string, userRequest: string): Promise<void> {
  const sessionId = `cli_session_${crypto.randomUUID()}`;
  bootstrapAgentRegistry();
  const container = AgentContainerFactory.createForCLI(sessionId, workspacePath);

  startAgentSpinner("Reasoning", userRequest);
  try {
    const handle = agentRuntime.execute(
      "planning",
      { workspacePath, userRequest },
      { sessionId, container, metadata: {} },
    );
    const result = await handle.result();
    if (result.outcome === AgentOutcome.SUCCESS) {
      stopAgentSpinner(true, "Plan created.");
      const data = result.data as PlanResult;
      console.log(`\n${picocolors.bold("taskId:")} ${picocolors.cyan(data.taskId)}`);
      console.log(`${picocolors.bold("goal:")} ${data.goal}`);
      console.log(`${picocolors.bold("order:")} ${data.order.join(" → ")}`);
      for (const t of data.tasks) {
        console.log(`  - [${t.id}] ${t.title}`);
      }
      console.log(`${picocolors.dim(`Use: peer-coder implement ${data.taskId}`)}\n`);
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
