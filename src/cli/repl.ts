import { interact } from "@/integration/llms/interact.js";
import { intro, isCancel, note, outro, text } from "@clack/prompts";
import { printBrandBanner } from "@cli/brand.js";
import { infoCommand } from "@cli/info.js";
import { logger } from "@utils/logger.js";
import picocolors from "picocolors";

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

    if (command === "/help" || command === "help") {
      note(
        `${picocolors.cyan("/info")}   - System & environment diagnostics\n` +
          `${picocolors.cyan("/clear")}  - Clear screen\n` +
          `${picocolors.cyan("/exit")}   - Exit session`,
        "Available Commands",
      );
      continue;
    }

    try {
      await interact(command);
      console.log(picocolors.dim("─────────────────────────────────────────────────────"));
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
    }
  }
}
