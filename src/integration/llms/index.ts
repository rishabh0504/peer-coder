import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "@prompts/system.js";
import { ollamaInstance } from "@providers/ollama/index.js";
import { allTools } from "@tools/registry.js";

export const boundModel = ollamaInstance.bindTools(allTools);

export const chatStream = async (input: string | BaseMessage[], customSystemPrompt?: string) => {
  let messages: BaseMessage[];

  if (typeof input === "string") {
    const systemText = customSystemPrompt || getSystemPrompt();
    messages = [new SystemMessage(systemText), new HumanMessage(input)];
  } else {
    messages = input;
  }

  const response = await boundModel.stream(messages);
  return response;
};
