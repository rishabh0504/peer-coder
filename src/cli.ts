import { Command } from "commander";
import { infoCommand } from "./cli/info.js";
import { initCommand } from "./cli/init.js";
import { handleError } from "./utils/errors.js";
import { logger } from "./utils/logger.js";

const program = new Command();

program
  .name("peer-coder")
  .description("Production-grade Node.js CLI template built with TypeScript")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize a new project interactively")
  .option("-n, --name <name>", "Project name")
  .option("-y, --yes", "Skip interactive prompts and use defaults", false)
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (err) {
      handleError(err);
    }
  });

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

program.on("command:*", (commands) => {
  logger.error(`Unknown command: ${commands.join(" ")}`);
  logger.info("Run `peer-coder --help` for a list of available commands.");
  process.exit(1);
});

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    handleError(err);
  }
}

main();
