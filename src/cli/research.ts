import crypto from "node:crypto";
import picocolors from "picocolors";
import type { ResearchResult } from "../agents/contracts/index.js";
import { AgentOutcome } from "../agents/core/agent_result.js";
import { bootstrapAgentRegistry } from "../agents/manifests/index.js";
import { AgentContainerFactory } from "../agents/runtime/container_factory.js";
import { agentRuntime } from "../agents/runtime/instance.js";
import { startAgentSpinner, stopAgentSpinner } from "../core/utils/spinner.js";

export async function researchCommand(workspacePath: string, query: string): Promise<void> {
  const sessionId = `cli_session_${crypto.randomUUID()}`;
  bootstrapAgentRegistry();
  const container = AgentContainerFactory.createForCLI(sessionId, workspacePath);

  startAgentSpinner("Analyzing", query);
  try {
    const handle = agentRuntime.execute(
      "research",
      { workspacePath, query },
      { sessionId, container, metadata: {} },
    );
    const result = await handle.result();
    if (result.outcome === AgentOutcome.SUCCESS || result.outcome === AgentOutcome.PARTIAL) {
      stopAgentSpinner(true, "Research done.");
      const data = result.data as ResearchResult;
      console.log(`\n${picocolors.bold("query:")} ${data.query}`);
      console.log(`${picocolors.bold("confidence:")} ${data.confidence}`);
      for (const f of data.findings.slice(0, 8)) {
        console.log(
          `  - ${picocolors.cyan(f.title)}\n    ${f.url}\n    ${picocolors.dim(f.excerpt.slice(0, 120))}`,
        );
      }
      for (const n of data.notes.slice(0, 5)) console.log(picocolors.dim(`  note: ${n}`));
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
