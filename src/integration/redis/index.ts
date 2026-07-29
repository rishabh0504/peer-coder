import { loadEnv } from "@config/env.js";
import { logger } from "@utils/logger.js";
import { Redis } from "ioredis";

let redisInstance: Redis | null = null;

export function getRedisInstance(): Redis {
  if (!redisInstance) {
    const env = loadEnv();
    redisInstance = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });

    redisInstance.on("error", (err) => {
      if (env.DEBUG) {
        logger.error(`Redis Connection Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    redisInstance.on("connect", () => {
      if (env.DEBUG) {
        logger.info("Redis Client Connected Successfully");
      }
    });
  }
  return redisInstance;
}

export async function closeRedisInstance(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}

export const redisClient = {
  get instance() {
    return getRedisInstance();
  },
  disconnect: closeRedisInstance,
};
