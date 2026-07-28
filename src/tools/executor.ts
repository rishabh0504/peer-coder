import { ToolMessage } from "@langchain/core/messages";
import { startAgentSpinner, stopAgentSpinner } from "@utils/spinner.js";
import type { ParsedToolCall } from "@utils/tool-parser.js";
import picocolors from "picocolors";
import { toolsMap } from "./registry.js";

export interface ToolExecutionResult {
  message: ToolMessage;
  output: string;
}

function printToolOutput(toolName: string, targetPath: string, displayContent: string): void {
  const header = targetPath
    ? `${picocolors.bold(picocolors.blue("┌─"))} ${picocolors.bold(picocolors.magenta(toolName))} ${picocolors.dim("─")} ${picocolors.cyan(targetPath)} ${picocolors.bold(picocolors.blue("─┐"))}`
    : `${picocolors.bold(picocolors.blue("┌─"))} ${picocolors.bold(picocolors.magenta(toolName))} ${picocolors.bold(picocolors.blue("─┐"))}`;

  console.log(`\n${header}`);
  console.log(picocolors.bold(picocolors.blue("│")));

  // Indent each line with a left border
  for (const line of displayContent.split("\n")) {
    console.log(`${picocolors.bold(picocolors.blue("│"))}  ${picocolors.white(line)}`);
  }

  console.log(picocolors.bold(picocolors.blue("│")));
  console.log(
    picocolors.bold(picocolors.blue("└─────────────────────────────────────────────────────")),
  );
  console.log();
}

export async function executeToolCall(toolCall: ParsedToolCall): Promise<ToolExecutionResult> {
  const tool = toolsMap.get(toolCall.name);
  const targetPath = (toolCall.args.path || toolCall.args.filePath || "") as string;

  startAgentSpinner(
    "Executing",
    `${picocolors.cyan(toolCall.name)}${targetPath ? ` ${picocolors.dim(targetPath)}` : ""}`,
  );

  if (!tool) {
    const errorMsg = `Tool '${toolCall.name}' is not registered in active tool registry.`;
    stopAgentSpinner(false, errorMsg);
    return {
      message: new ToolMessage(`Error: ${errorMsg}`, toolCall.id || "call_error"),
      output: errorMsg,
    };
  }

  try {
    const rawOutput = (await tool.invoke(toolCall.args)) as string;
    stopAgentSpinner(
      true,
      `${picocolors.green("✔")} ${picocolors.dim(`executed ${toolCall.name}`)}`,
    );

    let displayContent = rawOutput;
    try {
      const parsed = JSON.parse(rawOutput);
      if (parsed && typeof parsed.content === "string") {
        displayContent = parsed.content;
      } else if (parsed && typeof parsed === "object") {
        displayContent = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Keep raw string output if not JSON
    }

    printToolOutput(toolCall.name, targetPath, displayContent);

    return {
      message: new ToolMessage(rawOutput, toolCall.id || "call_default"),
      output: rawOutput,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    stopAgentSpinner(false, `${picocolors.red("✖")} ${picocolors.dim(`failed: ${errorMsg}`)}`);
    console.log(
      `\n${picocolors.red("✖")} ${picocolors.bold("Tool Error:")} ${picocolors.red(errorMsg)}\n`,
    );
    return {
      message: new ToolMessage(`Error: ${errorMsg}`, toolCall.id || "call_error"),
      output: errorMsg,
    };
  }
}
