import { infoCommand } from "@cli/info.js";
import { startRepl } from "@cli/repl.js";
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
  .command("repl", { isDefault: true })
  .description("Start interactive REPL session")
  .action(async () => {
    try {
      // If no subcommand/flag is passed, enter interactive REPL shell
      if (process.argv.length <= 2) {
        await startRepl();
      }
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
    if (process.argv.length <= 2) {
      await startRepl();
    } else {
      await program.parseAsync(process.argv);
    }
  } catch (err) {
    handleError(err);
  }
}

main();
