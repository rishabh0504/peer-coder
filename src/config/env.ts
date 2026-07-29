import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),

  OLLAMA_HOST_LOCAL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL_LOCAL: z.string().default("qwen2.5-coder:7b"),

  OLLAMA_HOST: z.string().url().default("https://ollama.com"),
  OLLAMA_MODEL: z.string().default("gpt-oss:20b-cloud"),

  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
  OLLAMA_LOCAL: z
    .preprocess((val) => {
      if (typeof val === "string") {
        if (val.toLowerCase() === "true") return true;
        if (val.toLowerCase() === "false") return false;
      }
      return val;
    }, z.boolean())
    .default(true),
  DEBUG: z
    .preprocess((val) => {
      if (typeof val === "string") {
        if (val.toLowerCase() === "true") return true;
        if (val.toLowerCase() === "false") return false;
      }
      return val;
    }, z.boolean())
    .default(false),

  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
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
