import readline from "node:readline";
import { printBrandBanner } from "@cli/brand.js";
import { infoCommand } from "@cli/info.js";
import { logger } from "@utils/logger.js";
import picocolors from "picocolors";
import { interact } from "../integration/interact.js";

const COMMANDS = ["/info", "/help", "/clear", "/exit"];

function completer(line: string) {
  const hits = COMMANDS.filter((c) => c.startsWith(line.trim()));
  return [hits.length ? hits : COMMANDS, line];
}

export async function startRepl(): Promise<void> {
  printBrandBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${picocolors.bold(picocolors.cyan("> "))}`,
    completer,
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    if (input === "/exit" || input === "exit") {
      logger.info("Goodbye! 👋");
      process.exit(0);
    }

    if (input === "/clear" || input === "clear") {
      console.clear();
      printBrandBanner();
      rl.prompt();
      return;
    }

    if (input === "/info") {
      infoCommand();
      rl.prompt();
      return;
    }

    if (input === "/help" || input === "help") {
      console.log(`
  ${picocolors.bold("Commands:")}
    ${picocolors.cyan("/info")}   - System & environment diagnostics
    ${picocolors.cyan("/clear")}  - Clear screen
    ${picocolors.cyan("/exit")}   - Exit session
`);
      rl.prompt();
      return;
    }

    // AI prompt streaming interaction
    rl.pause();
    try {
      await interact(input);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
    }
    rl.resume();
    rl.prompt();
  });

  rl.on("close", () => {
    logger.info("Session closed.");
    process.exit(0);
  });
}
