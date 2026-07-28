import { loadEnv } from "@config/env.js";
import { ChatOllama } from "@langchain/ollama";

const env = loadEnv();

const ollamaLocalInstance = new ChatOllama({
    model: env.OLLAMA_MODEL_LOCAL,
    baseUrl: env.OLLAMA_HOST_LOCAL,
    maxRetries: 2,
    streaming: true,
});
const ollamaCloudInstance = new ChatOllama({
    model: env.OLLAMA_MODEL,
    baseUrl: env.OLLAMA_HOST,
    maxRetries: 2,
    streaming: true,
});
const instance = env.OLLAMA_LOCAL ? ollamaLocalInstance : ollamaCloudInstance
export { instance as ollamaInstance };
