import { bootstrapAgentRegistry } from "../agents/manifests/index.js";
import { agentRuntime } from "../agents/runtime/instance.js";
import { AgentContainerFactory } from "../agents/runtime/container_factory.js";
import { renderWorkspaceResult } from "./renderers/workspace_renderer.js";
import { startAgentSpinner, stopAgentSpinner } from "../core/utils/spinner.js";
import { AgentOutcome } from "../agents/core/agent_result.js";
import picocolors from "picocolors";
import crypto from "node:crypto";

export async function analyzeCommand(
  workspacePath: string,
  includeSummary: boolean,
): Promise<void> {
  const sessionId = `cli_session_${crypto.randomUUID()}`;

  // Initialize registries
  bootstrapAgentRegistry();

  const container = AgentContainerFactory.createForCLI(sessionId);
  const context = {
    sessionId,
    container,
    metadata: {},
  };

  startAgentSpinner("Analyzing", `workspace tech stack at ${workspacePath}`);

  try {
    const handle = agentRuntime.execute(
      "workspace_intelligence",
      {
        workspacePath,
        includeSummary,
      },
      context,
    );

    const result = await handle.result();

    if (result.outcome === AgentOutcome.SUCCESS) {
      stopAgentSpinner(true, "Workspace analysis completed successfully.");
      const data = result.data as any;
      renderWorkspaceResult({
        workspaceContext: data?.workspaceContext,
        summary: data?.summary,
        status: data?.status || "completed",
      });
    } else {
      const errMsg = result.error?.message || "Unknown execution error";
      stopAgentSpinner(false, `Analysis failed: ${errMsg}`);
      console.log(`\n${picocolors.red("✖")} ${picocolors.bold("Agent Error:")} ${picocolors.red(errMsg)}\n`);
    }
  } catch (err: any) {
    const errMsg = err.message || String(err);
    stopAgentSpinner(false, `Analysis failed: ${errMsg}`);
    console.log(`\n${picocolors.red("✖")} ${picocolors.bold("System Error:")} ${picocolors.red(errMsg)}\n`);
  }
}
