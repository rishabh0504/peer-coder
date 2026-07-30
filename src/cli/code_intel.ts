import crypto from "node:crypto";
import picocolors from "picocolors";
import type { CodeIntelResult } from "../agents/contracts/index.js";
import { AgentOutcome } from "../agents/core/agent_result.js";
import { bootstrapAgentRegistry } from "../agents/manifests/index.js";
import { AgentContainerFactory } from "../agents/runtime/container_factory.js";
import { agentRuntime } from "../agents/runtime/instance.js";
import { startAgentSpinner, stopAgentSpinner } from "../core/utils/spinner.js";

export async function codeIntelCommand(workspacePath: string, query: string): Promise<void> {
  const sessionId = `cli_session_${crypto.randomUUID()}`;
  bootstrapAgentRegistry();
  const container = AgentContainerFactory.createForCLI(sessionId, workspacePath);

  startAgentSpinner("Indexing", query);
  try {
    const handle = agentRuntime.execute(
      "code_intelligence",
      { workspacePath, query },
      { sessionId, container, metadata: {} },
    );
    const result = await handle.result();
    if (result.outcome === AgentOutcome.SUCCESS) {
      stopAgentSpinner(true, "Code intelligence completed.");
      const data = result.data as CodeIntelResult;
      console.log(`\n${picocolors.bold("Summary:")} ${data.summary}`);
      console.log(
        `${picocolors.bold("Impacted:")} ${data.impactedPaths.slice(0, 15).join(", ") || "(none)"}`,
      );
      console.log(`${picocolors.bold("Symbols:")} ${data.symbols.length}`);
      for (const s of data.symbols.slice(0, 20)) {
        console.log(`  - ${s.kind} ${picocolors.cyan(s.name)} @ ${s.filePath}:${s.startLine}`);
      }
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
