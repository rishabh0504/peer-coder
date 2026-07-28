import ora, { type Ora } from "ora";
import picocolors from "picocolors";

export type AgentVerb =
  | "Thinking"
  | "Analyzing"
  | "Reasoning"
  | "Executing"
  | "Validating"
  | "Indexing"
  | "Searching";

let activeSpinner: Ora | null = null;

export function startAgentSpinner(verb: AgentVerb = "Thinking", details?: string): Ora {
  if (activeSpinner) {
    activeSpinner.stop();
  }

  const label = details
    ? `${picocolors.cyan(verb)} ${picocolors.dim(details)}...`
    : `${picocolors.cyan(verb)}...`;

  activeSpinner = ora({
    text: label,
    spinner: "dots",
    color: "cyan",
  }).start();

  return activeSpinner;
}

export function updateAgentSpinner(verb: AgentVerb, details?: string): void {
  if (!activeSpinner) {
    startAgentSpinner(verb, details);
    return;
  }

  const label = details
    ? `${picocolors.cyan(verb)} ${picocolors.dim(details)}...`
    : `${picocolors.cyan(verb)}...`;

  activeSpinner.text = label;
}

export function stopAgentSpinner(success = true, message?: string): void {
  if (!activeSpinner) return;

  if (success) {
    if (message) {
      activeSpinner.succeed(picocolors.green(message));
    } else {
      activeSpinner.stop();
    }
  } else {
    activeSpinner.fail(picocolors.red(message || "Operation failed"));
  }

  activeSpinner = null;
}
