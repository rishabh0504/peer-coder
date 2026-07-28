import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),

  OLLAMA_HOST_LOCAL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL_LOCAL: z.string().default("gemma3:1b"),

  OLLAMA_HOST: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("gemma3:1b"),

  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
  OLLAMA_LOCAL: z.boolean().default(true)
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment configuration:", result.error.format());
    return envSchema.parse({});
  }
  return result.data;
}
