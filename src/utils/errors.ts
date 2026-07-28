import { logger } from "./logger.js";

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly exitCode = 1,
  ) {
    super(message);
    this.name = "CLIError";
  }
}

export function handleError(error: unknown): void {
  if (error instanceof CLIError) {
    logger.error(error.message);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    logger.error(`Unexpected Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }

  logger.error(`An unknown error occurred: ${String(error)}`);
  process.exit(1);
}
