import { spinner as clackSpinner } from "@clack/prompts";
import { loadEnv } from "@config/env.js";
import picocolors from "picocolors";

export type AgentVerb =
  | "Thinking"
  | "Analyzing"
  | "Reasoning"
  | "Executing"
  | "Validating"
  | "Indexing"
  | "Searching";

export type ClackSpinnerInstance = ReturnType<typeof clackSpinner>;

let activeSpinner: ClackSpinnerInstance | null = null;

const isDebug = (): boolean => {
  try {
    const env = loadEnv();
    return env.DEBUG === true;
  } catch {
    return false;
  }
};

export function startAgentSpinner(
  verb: AgentVerb = "Thinking",
  details?: string,
): ClackSpinnerInstance | null {
  if (!isDebug()) return null;

  if (activeSpinner) {
    try {
      activeSpinner.stop();
    } catch {
      // Ignore if already stopped
    }
  }

  const label = details
    ? `${picocolors.cyan(verb)} ${picocolors.dim(details)}...`
    : `${picocolors.cyan(verb)}...`;

  activeSpinner = clackSpinner();
  activeSpinner.start(label);

  return activeSpinner;
}

export function updateAgentSpinner(verb: AgentVerb, details?: string): void {
  if (!isDebug()) return;

  if (!activeSpinner) {
    startAgentSpinner(verb, details);
    return;
  }

  const label = details
    ? `${picocolors.cyan(verb)} ${picocolors.dim(details)}...`
    : `${picocolors.cyan(verb)}...`;

  activeSpinner.message(label);
}

export function stopAgentSpinner(success = true, message?: string): void {
  if (!activeSpinner) return;

  if (success) {
    activeSpinner.stop(message ? picocolors.green(message) : undefined);
  } else {
    activeSpinner.stop(picocolors.red(message || "Operation failed"));
  }

  activeSpinner = null;
}
