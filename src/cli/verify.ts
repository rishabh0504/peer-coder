import crypto from "node:crypto";
import picocolors from "picocolors";
import type { VerificationResult } from "../agents/contracts/index.js";
import { AgentOutcome } from "../agents/core/agent_result.js";
import { bootstrapAgentRegistry } from "../agents/manifests/index.js";
import { AgentContainerFactory } from "../agents/runtime/container_factory.js";
import { agentRuntime } from "../agents/runtime/instance.js";
import { startAgentSpinner, stopAgentSpinner } from "../core/utils/spinner.js";

export async function verifyCommand(workspacePath: string, taskId?: string): Promise<void> {
  const sessionId = `cli_session_${crypto.randomUUID()}`;
  bootstrapAgentRegistry();
  const container = AgentContainerFactory.createForCLI(sessionId, workspacePath);

  startAgentSpinner("Validating", workspacePath);
  try {
    const handle = agentRuntime.execute(
      "verification",
      { workspacePath, taskId },
      { sessionId, container, metadata: {} },
    );
    const result = await handle.result();
    const data = result.data as VerificationResult | undefined;
    if (result.outcome === AgentOutcome.SUCCESS || result.outcome === AgentOutcome.PARTIAL) {
      stopAgentSpinner(
        data?.passed ?? false,
        data?.passed ? "Verification passed." : "Verification issues found.",
      );
      if (data) {
        console.log(`\n${picocolors.bold("passed:")} ${data.passed}`);
        for (const c of data.commandsRun) {
          const mark = c.exitCode === 0 ? picocolors.green("✓") : picocolors.red("✖");
          console.log(`  ${mark} ${c.cmd} (exit ${c.exitCode})`);
        }
        for (const f of data.failures) {
          console.log(`  ${picocolors.red(f.code)}: ${f.message}`);
        }
        console.log();
      }
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
