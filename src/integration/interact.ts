import { startAgentSpinner, stopAgentSpinner } from "@utils/spinner.js";
import { chatStream } from "./index.js";

export const interact = async (prompt: string) => {
  startAgentSpinner("Thinking", "reasoning over prompt");

  let firstTokenReceived = false;

  try {
    const stream = await chatStream(prompt);

    for await (const chunk of stream) {
      if (!firstTokenReceived) {
        stopAgentSpinner(true);
        firstTokenReceived = true;
      }

      const text =
        typeof chunk.content === "string" ? chunk.content : JSON.stringify(chunk.content);
      process.stdout.write(text);
    }

    if (!firstTokenReceived) {
      stopAgentSpinner(true);
    }

    process.stdout.write("\n");
  } catch (err) {
    stopAgentSpinner(false, "Failed to generate response");
    throw err;
  }
};
