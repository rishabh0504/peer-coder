import { analyzeCommand } from "@cli/analyze.js";
import { codeIntelCommand } from "@cli/code_intel.js";
import { debugCommand } from "@cli/debug.js";
import { implementCommand } from "@cli/implement.js";
import { infoCommand } from "@cli/info.js";
import { orchestrateCommand } from "@cli/orchestrate.js";
import { planCommand } from "@cli/plan.js";
import { startRepl } from "@cli/repl.js";
import { researchCommand } from "@cli/research.js";
import { verifyCommand } from "@cli/verify.js";
import { handleError } from "@utils/errors.js";
import { logger } from "@utils/logger.js";
import { Command } from "commander";

const program = new Command();

program.name("peer-coder").description("Node.js CLI Coder Agent").version("1.0.0");

program
  .command("info")
  .description("Display system and environment diagnostic info")
  .action(() => {
    try {
      infoCommand();
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("analyze")
  .description("Analyze tech stack of a workspace (Repository Analysis)")
  .option("-p, --path <dir>", "Target workspace path", process.cwd())
  .option("-s, --summary", "Generate LLM summary via Ollama", false)
  .action(async (opts) => {
    try {
      await analyzeCommand(opts.path, opts.summary);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("code-intel")
  .description("Run Code Intelligence (symbols/files/edges)")
  .argument("<query>", "Symbol name or search query")
  .option("-p, --path <dir>", "Target workspace path", process.cwd())
  .action(async (query, opts) => {
    try {
      await codeIntelCommand(opts.path, query);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("plan")
  .description("Create an implementation plan (L1 task)")
  .argument("<request>", "What to build or change")
  .option("-p, --path <dir>", "Target workspace path", process.cwd())
  .action(async (request, opts) => {
    try {
      await planCommand(opts.path, request);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("implement")
  .description("Execute a plan task step")
  .argument("<taskId>", "Task id from peer-coder plan")
  .option("-p, --path <dir>", "Target workspace path", process.cwd())
  .option("--step <stepId>", "Specific step id")
  .action(async (taskId, opts) => {
    try {
      await implementCommand(opts.path, taskId, opts.step);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("verify")
  .description("Run verification (typecheck/lint/test)")
  .option("-p, --path <dir>", "Target workspace path", process.cwd())
  .option("-t, --task <taskId>", "Optional task id for acceptance criteria")
  .action(async (opts) => {
    try {
      await verifyCommand(opts.path, opts.task);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("debug")
  .description("Diagnose verification failures for a task (no writes)")
  .argument("<taskId>", "Task id")
  .option("-p, --path <dir>", "Target workspace path", process.cwd())
  .action(async (taskId, opts) => {
    try {
      await debugCommand(opts.path, taskId);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("research")
  .description("Research docs/APIs via web_search + fetch_webpage")
  .argument("<query>", "What to research")
  .option("-p, --path <dir>", "Target workspace path", process.cwd())
  .action(async (query, opts) => {
    try {
      await researchCommand(opts.path, query);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("orchestrate")
  .description("Run slim Orchestrator workflow for a freeform request")
  .argument("<request>", "User request")
  .option("-p, --path <dir>", "Target workspace path", process.cwd())
  .option(
    "-w, --workflow <id>",
    "Force workflow: workspace_analyze|status_query|research_only|coding_change",
  )
  .action(async (request, opts) => {
    try {
      await orchestrateCommand(opts.path, request, opts.workflow);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("repl", { isDefault: true })
  .description("Start interactive REPL session")
  .action(async () => {
    try {
      await startRepl();
    } catch (err) {
      handleError(err);
    }
  });

program.on("command:*", (commands) => {
  logger.error(`Unknown command: ${commands.join(" ")}`);
  logger.info("Run `peer-coder --help` for a list of available commands.");
  process.exit(1);
});

export async function main(argv: string[] = process.argv) {
  try {
    if (argv.length <= 2) {
      await startRepl();
    } else {
      await program.parseAsync(argv);
    }
  } catch (err) {
    handleError(err);
  }
}

export { program };

if (process.env.NODE_ENV !== "test") {
  main();
}
