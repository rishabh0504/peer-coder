import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "@prompts/system.js";
import { executeToolCall } from "@tools/executor.js";
import { startAgentSpinner, stopAgentSpinner } from "@utils/spinner.js";
import { parseToolCall } from "@utils/tool-parser.js";
import { chatStream } from "./index.js";

export const interact = async (userPrompt: string) => {
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

    process.stdout.write("\n");

    // Parse tool invocation (native or fallback text)
    const toolCall = parseToolCall(nativeToolCalls, accumulatedContent);

    if (toolCall) {
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
      const { message: toolMessage } = await executeToolCall(toolCall);
      messages.push(toolMessage);
    }
  } catch (err) {
    stopAgentSpinner(false, "Failed to generate response");
    throw err;
  }
};
