import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InMemoryMemoryManager } from "../../memory/memory_manager.js";
import { getArtifactStore } from "../artifacts/index.js";
import type { VerificationResult } from "../contracts/index.js";
import type { AgentResult } from "../core/agent_result.js";
import { AgentOutcome } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import type { VerificationInput } from "./schema.js";

async function runCommand(
  cwd: string,
  cmd: string,
  signal?: AbortSignal,
): Promise<{ exitCode: number; excerpt: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, {
      cwd,
      shell: true,
      env: process.env,
    });
    let out = "";
    const onData = (buf: Buffer) => {
      out += buf.toString("utf8");
      if (out.length > 4000) out = out.slice(-4000);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    const onAbort = () => {
      child.kill("SIGTERM");
    };
    signal?.addEventListener("abort", onAbort);
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      resolve({ exitCode: code ?? 1, excerpt: out.trim().slice(0, 2000) });
    });
  });
}

async function detectCommands(workspacePath: string, override?: string[]): Promise<string[]> {
  if (override?.length) return override;
  try {
    const pkg = JSON.parse(await readFile(path.join(workspacePath, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scripts = pkg.scripts ?? {};
    const cmds: string[] = [];
    if (scripts.typecheck) cmds.push("pnpm typecheck");
    else if (scripts["type-check"]) cmds.push("pnpm run type-check");
    if (scripts.lint) cmds.push("pnpm lint");
    if (scripts.test) cmds.push("pnpm test");
    if (cmds.length === 0) cmds.push("pnpm typecheck");
    return cmds;
  } catch {
    return ["pnpm typecheck"];
  }
}

export const verificationHandler: AgentHandler = {
  async execute(state: unknown, context: AgentExecutionContext): Promise<AgentResult> {
    try {
      const input = state as VerificationInput;
      const mm = context.container.memoryManager as InMemoryMemoryManager | undefined;
      const task = input.taskId && mm ? await mm.getTask(input.taskId) : null;
      const commands = await detectCommands(input.workspacePath, input.commands);

      const commandsRun: VerificationResult["commandsRun"] = [];
      const failures: VerificationResult["failures"] = [];

      for (const cmd of commands) {
        const result = await runCommand(input.workspacePath, cmd, context.signal);
        commandsRun.push({ cmd, exitCode: result.exitCode, excerpt: result.excerpt });
        if (result.exitCode !== 0) {
          failures.push({
            code: "COMMAND_FAILED",
            message: `${cmd} exited ${result.exitCode}`,
          });
        }
      }

      const criteria = task?.acceptanceCriteria?.length
        ? task.acceptanceCriteria
        : ["Commands completed successfully"];
      const acceptance = criteria.map((criterion) => ({
        criterion,
        met: failures.length === 0,
      }));

      const data: VerificationResult = {
        passed: failures.length === 0,
        commandsRun,
        failures,
        acceptance,
      };

      if (input.taskId) {
        getArtifactStore().put({
          taskId: input.taskId,
          kind: "verification",
          producerAgentId: "verification",
          data,
        });
      }

      return {
        outcome: data.passed ? AgentOutcome.SUCCESS : AgentOutcome.PARTIAL,
        data,
      };
    } catch (err: unknown) {
      return {
        outcome: AgentOutcome.FAILED,
        error: {
          code: "VERIFICATION_ERROR",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};
