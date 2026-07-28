import { ToolMessage } from "@langchain/core/messages";
import { startAgentSpinner, stopAgentSpinner } from "@utils/spinner.js";
import type { ParsedToolCall } from "@utils/tool-parser.js";
import picocolors from "picocolors";
import { toolsMap } from "./registry.js";

export interface ToolExecutionResult {
  message: ToolMessage;
  output: string;
}

export async function executeToolCall(toolCall: ParsedToolCall): Promise<ToolExecutionResult> {
  const tool = toolsMap.get(toolCall.name);
  const targetPath = (toolCall.args.path || toolCall.args.filePath || "") as string;

  startAgentSpinner("Executing", `${toolCall.name} ${targetPath}`.trim());

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
    stopAgentSpinner(true, `Successfully executed ${toolCall.name}`);

    let displayContent = rawOutput;
    try {
      const parsed = JSON.parse(rawOutput);
      if (parsed && typeof parsed.content === "string") {
        displayContent = parsed.content;
      }
    } catch {
      // Keep raw string output if not JSON
    }

    if (targetPath) {
      console.log(picocolors.bold(picocolors.blue(`\n📄 ${targetPath} Content:\n`)));
    }
    console.log(picocolors.cyan(displayContent));
    console.log();

    return {
      message: new ToolMessage(rawOutput, toolCall.id || "call_default"),
      output: rawOutput,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    stopAgentSpinner(false, `Tool execution failed: ${errorMsg}`);
    return {
      message: new ToolMessage(`Error: ${errorMsg}`, toolCall.id || "call_error"),
      output: errorMsg,
    };
  }
}
