import { loadEnv } from "@config/env.js";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "@prompts/system.js";
import { executeToolCall } from "@tools/executor.js";
import { startAgentSpinner, stopAgentSpinner } from "@utils/spinner.js";
import { parseToolCall } from "@utils/tool-parser.js";
import chalk from "chalk";
import { chatStream } from "./index.js";

export interface InteractOptions {
  maxSteps?: number;
}

export const interact = async (userPrompt: string) => {
  const env = loadEnv();
  const isDebug = env.DEBUG === true;

  const messages: BaseMessage[] = [
    new SystemMessage(getSystemPrompt()),
    new HumanMessage(userPrompt),
  ];

  startAgentSpinner("Thinking", "reasoning over prompt");

  let firstTokenReceived = false;
  let accumulatedContent = "";
  const nativeToolCalls: Array<{ id?: string; name: string; args?: Record<string, unknown> }> = [];

  try {
    const stream = await chatStream(messages);

    for await (const chunk of stream) {
      if (!firstTokenReceived) {
        stopAgentSpinner(true);
        firstTokenReceived = true;
      }

      if (typeof chunk.content === "string" && chunk.content) {
        accumulatedContent += chunk.content;
        if (isDebug) {
          process.stdout.write(chunk.content);
        }
      }

      if (chunk.tool_calls && chunk.tool_calls.length > 0) {
        for (const tc of chunk.tool_calls) {
          nativeToolCalls.push({
            id: tc.id || `call_${Date.now()}`,
            name: tc.name,
            args: tc.args as Record<string, unknown>,
          });
        }
      }
    }

    if (!firstTokenReceived) {
      stopAgentSpinner(true);
    }

    if (isDebug && accumulatedContent.length > 0) {
      process.stdout.write("\n");
    }

    // Parse tool invocation (native or fallback text)
    const toolCall = parseToolCall(nativeToolCalls, accumulatedContent);

    if (toolCall) {
      // Execute tool call
      startAgentSpinner("Executing", `${chalk.cyan(toolCall.name)}`);
      await executeToolCall(toolCall);
    } else if (!isDebug && accumulatedContent.length > 0) {
      console.log(accumulatedContent);
    }
  } catch (err) {
    stopAgentSpinner(false, "Failed during agent interaction step");
    throw err;
  }
};
