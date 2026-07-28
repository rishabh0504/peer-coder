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

export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly errorCode = "EXECUTION_ERROR",
    public readonly attempts = 1,
  ) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

export function handleError(error: unknown): void {
  if (error instanceof CLIError) {
    logger.error(error.message);
    process.exit(error.exitCode);
  }

  if (error instanceof ToolExecutionError) {
    logger.error(`[${error.toolName}] Error (${error.errorCode}): ${error.message}`);
    process.exit(1);
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
