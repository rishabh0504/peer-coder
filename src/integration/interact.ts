import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "@prompts/system.js";
import { executeToolCall } from "@tools/executor.js";
import { startAgentSpinner, stopAgentSpinner } from "@utils/spinner.js";
import { parseToolCall } from "@utils/tool-parser.js";
import chalk from "chalk";
import { chatStream } from "./index.js";

export interface InteractOptions {
  maxSteps?: number;
}

export const interact = async (userPrompt: string, options: InteractOptions = {}) => {
  const maxSteps = options.maxSteps ?? 10;
  const messages: BaseMessage[] = [
    new SystemMessage(getSystemPrompt()),
    new HumanMessage(userPrompt),
  ];

  let stepCount = 0;

  while (stepCount < maxSteps) {
    stepCount++;
    startAgentSpinner("Thinking", `reasoning over prompt (step ${stepCount}/${maxSteps})`);

    let firstTokenReceived = false;
    let accumulatedContent = "";
    const nativeToolCalls: Array<{ id?: string; name: string; args?: Record<string, unknown> }> =
      [];

    try {
      const stream = await chatStream(messages);

      for await (const chunk of stream) {
        if (!firstTokenReceived) {
          stopAgentSpinner(true);
          firstTokenReceived = true;
        }

        if (typeof chunk.content === "string" && chunk.content) {
          accumulatedContent += chunk.content;
          process.stdout.write(chunk.content);
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

      if (accumulatedContent.length > 0) {
        process.stdout.write("\n");
      }

      // Parse tool invocation (native or fallback text)
      const toolCall = parseToolCall(nativeToolCalls, accumulatedContent);

      if (!toolCall) {
        // No tool call requested -> agent response complete
        break;
      }

      // Push AI message with tool calls
      const aiMessage = new AIMessage({
        content: accumulatedContent,
        tool_calls: [
          {
            name: toolCall.name,
            args: toolCall.args,
            id: toolCall.id,
          },
        ],
      });
      messages.push(aiMessage);

      // Execute tool call and append ToolMessage result
      startAgentSpinner("Executing", `${chalk.cyan(toolCall.name)}`);
      const { message: toolMessage } = await executeToolCall(toolCall);

      messages.push(toolMessage);
    } catch (err) {
      stopAgentSpinner(false, "Failed during agent interaction step");
      throw err;
    }
  }
};
