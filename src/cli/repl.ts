import { interact } from "@/integration/llms/interact.js";
import { intro, isCancel, note, outro, text } from "@clack/prompts";
import { printBrandBanner } from "@cli/brand.js";
import { infoCommand } from "@cli/info.js";
import { logger } from "@utils/logger.js";
import picocolors from "picocolors";
import { analyzeCommand } from "./analyze.js";
import { codeIntelCommand } from "./code_intel.js";
import { implementCommand } from "./implement.js";
import { orchestrateCommand } from "./orchestrate.js";
import { planCommand } from "./plan.js";
import { researchCommand } from "./research.js";
import { verifyCommand } from "./verify.js";

export async function startRepl(): Promise<void> {
  printBrandBanner();
  intro(picocolors.bgCyan(picocolors.black(" PEER CODER AGENT SESSION ")));

  const running = true;

  while (running) {
    const input = await text({
      message: "What would you like me to build or modify?",
      placeholder: "Type a prompt or command (/info, /clear, /exit, /help)",
      validate(value) {
        if (value.trim().length === 0) {
          return "Please enter a non-empty prompt or command.";
        }
        return undefined;
      },
    });

    if (isCancel(input)) {
      outro("Session cancelled. Goodbye! 👋");
      break;
    }

    const command = (input as string).trim();

    if (command === "/exit" || command === "exit") {
      outro("Goodbye! 👋");
      break;
    }

    if (command === "/clear" || command === "clear") {
      console.clear();
      printBrandBanner();
      intro(picocolors.bgCyan(picocolors.black(" PEER CODER AGENT SESSION ")));
      continue;
    }

    if (command === "/info") {
      infoCommand();
      continue;
    }

    if (command.startsWith("/analyze")) {
      const withSummary = command.includes("--summary");
      await analyzeCommand(process.cwd(), withSummary);
      continue;
    }

    if (command.startsWith("/code-intel")) {
      const q = command.replace(/^\/code-intel\s*/, "").trim();
      if (!q) {
        note("Usage: /code-intel <symbol-or-query>", "Code Intel");
        continue;
      }
      await codeIntelCommand(process.cwd(), q);
      continue;
    }

    if (command.startsWith("/plan")) {
      const req = command
        .replace(/^\/plan\s*/, "")
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!req) {
        note('Usage: /plan "Add OAuth"', "Planning");
        continue;
      }
      await planCommand(process.cwd(), req);
      continue;
    }

    if (command.startsWith("/implement")) {
      const rest = command
        .replace(/^\/implement\s*/, "")
        .trim()
        .split(/\s+/);
      const taskId = rest[0];
      if (!taskId) {
        note("Usage: /implement <taskId> [--step <id>]", "Implement");
        continue;
      }
      const stepIdx = rest.indexOf("--step");
      const stepId = stepIdx >= 0 ? rest[stepIdx + 1] : undefined;
      await implementCommand(process.cwd(), taskId, stepId);
      continue;
    }

    if (command.startsWith("/verify")) {
      const parts = command
        .replace(/^\/verify\s*/, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      await verifyCommand(process.cwd(), parts[0]);
      continue;
    }

    if (command.startsWith("/research")) {
      const q = command.replace(/^\/research\s*/, "").trim();
      if (!q) {
        note('Usage: /research "zod coerce docs"', "Research");
        continue;
      }
      await researchCommand(process.cwd(), q);
      continue;
    }

    if (command.startsWith("/orchestrate")) {
      const req = command.replace(/^\/orchestrate\s*/, "").trim();
      if (!req) {
        note('Usage: /orchestrate "add feature X"', "Orchestrator");
        continue;
      }
      await orchestrateCommand(process.cwd(), req);
      continue;
    }

    if (command === "/help" || command === "help") {
      note(
        `${picocolors.cyan("/analyze")} [-s, --summary] - Repository Analysis\n` +
          `${picocolors.cyan("/code-intel")} <query>     - Symbol/file graph\n` +
          `${picocolors.cyan("/research")} "..."         - Web docs research\n` +
          `${picocolors.cyan("/plan")} "..."             - Create L1 plan/task\n` +
          `${picocolors.cyan("/implement")} <taskId>     - Execute plan step\n` +
          `${picocolors.cyan("/verify")} [taskId]        - Typecheck/lint/test\n` +
          `${picocolors.cyan("/orchestrate")} "..."      - Full workflow\n` +
          `${picocolors.cyan("/info")}                   - Diagnostics\n` +
          `${picocolors.cyan("/clear")}                  - Clear screen\n` +
          `${picocolors.cyan("/exit")}                   - Exit\n` +
          `${picocolors.dim("Freeform text → Orchestrator")}`,
        "Available Commands",
      );
      continue;
    }

    try {
      if (process.env.PEER_CODER_LEGACY_INTERACT === "1") {
        await interact(command);
      } else {
        await orchestrateCommand(process.cwd(), command);
      }
      console.log(picocolors.dim("─────────────────────────────────────────────────────"));
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
    }
  }
}
