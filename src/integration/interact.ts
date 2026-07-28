import { loadEnv } from "@config/env.js";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "@prompts/system.js";
import { executeToolCall } from "@tools/executor.js";
import {
  isDebug,
  startAgentSpinner,
  stopAgentSpinner,
  updateAgentSpinner,
} from "@utils/spinner.js";
import { parseToolCall } from "@utils/tool-parser.js";
import chalk from "chalk";
import picocolors from "picocolors";
import { chatStream } from "./index.js";

export interface InteractOptions {
  maxSteps?: number;
}

export const interact = async (userPrompt: string) => {
  loadEnv(); // ensure env is loaded (side-effect: validates config)
  const debug = isDebug();

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
        firstTokenReceived = true;

        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          // Model is calling a tool — update spinner label
          const toolName = chunk.tool_calls[0].name;
          updateAgentSpinner("Analyzing", `preparing ${chalk.cyan(toolName)}`);
        } else {
          // Model is returning plain text — stop spinner and stream directly
          stopAgentSpinner(true);
          process.stdout.write("\n");
        }
      }

      if (typeof chunk.content === "string" && chunk.content) {
        accumulatedContent += chunk.content;
        // Always stream text to stdout (not only in debug mode)
        if (!nativeToolCalls.length) {
          process.stdout.write(picocolors.white(chunk.content));
        } else if (debug) {
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

    // Ensure spinner stopped after stream ends
    if (firstTokenReceived && nativeToolCalls.length > 0) {
      // will be stopped inside executeToolCall
    } else if (!firstTokenReceived) {
      stopAgentSpinner(true);
    }

    // Print trailing newline after streamed text
    if (accumulatedContent.length > 0 && !nativeToolCalls.length) {
      process.stdout.write("\n");
    }

    // Parse tool invocation (native or fallback text)
    const toolCall = parseToolCall(nativeToolCalls, accumulatedContent);

    if (toolCall) {
      stopAgentSpinner(true);
      await executeToolCall(toolCall);
    } else if (debug && accumulatedContent.length > 0 && nativeToolCalls.length > 0) {
      // Debug: dump raw content that wasn't streamed
      console.log(accumulatedContent);
    }
  } catch (err) {
    stopAgentSpinner(false, "Failed during agent interaction step");
    throw err;
  }
};
