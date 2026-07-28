import { ollamaInstance } from "@/providers/ollama/index.js";

export const chatStream = async (prompt: string) => {
  const response = await ollamaInstance.stream(prompt);
  return response;
};
