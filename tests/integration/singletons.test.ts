import { describe, expect, it, vi } from "vitest";

vi.mock("ioredis", () => {
  const EventEmitter = require("node:events");
  class MockRedis extends EventEmitter {
    disconnect = vi.fn().mockResolvedValue(undefined);
    quit = vi.fn().mockResolvedValue(undefined);
  }
  return {
    Redis: MockRedis,
    default: MockRedis,
  };
});

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
});

vi.mock("@langchain/ollama", () => {
  class MockOllamaEmbeddings {
    embedDocuments = vi.fn().mockResolvedValue([[0.1, 0.2]]);
    embedQuery = vi.fn().mockResolvedValue([0.1, 0.2]);
  }
  class MockChatOllama {
    bindTools = vi.fn().mockReturnThis();
    stream = vi.fn().mockResolvedValue([]);
  }
  return {
    OllamaEmbeddings: MockOllamaEmbeddings,
    ChatOllama: MockChatOllama,
  };
});

vi.mock("../../src/config/env.js", () => {
  return {
    loadEnv: () => ({
      NODE_ENV: "test",
      LOG_LEVEL: "info",
      OLLAMA_HOST_LOCAL: "http://localhost:11434",
      OLLAMA_MODEL_LOCAL: "qwen2.5-coder:7b",
      OLLAMA_HOST: "https://ollama.com",
      OLLAMA_MODEL: "gpt-oss:20b-cloud",
      OLLAMA_EMBED_MODEL: "nomic-embed-text",
      OLLAMA_LOCAL: true,
      DEBUG: false,
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: 6379,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "fake-key",
      SUPABASE_SERVICE_ROLE_KEY: "fake-role-key",
    }),
  };
});

import { getSupabaseInstance, supabaseClient } from "../../src/integration/database/index.js";
import { getRedisInstance, redisClient } from "../../src/integration/redis/index.js";
import { getEmbeddingsInstance, vectorEmbeddings } from "../../src/integration/vectors/index.js";
import "../../src/integration/index.js";

describe("Singleton clients unit test", () => {
  it("should ensure Redis client is a singleton", () => {
    const client1 = getRedisInstance();
    const client2 = getRedisInstance();
    const client3 = redisClient.instance;

    expect(client1).toBeDefined();
    expect(client2).toBe(client1);
    expect(client3).toBe(client1);

    // clean up redis connection so the test process exits cleanly
    redisClient.disconnect();
  });

  it("should cover Redis event handlers for error and connect", async () => {
    vi.resetModules();
    vi.doMock("../../src/config/env.js", () => ({
      loadEnv: () => ({
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: 6379,
        DEBUG: true,
      }),
    }));

    const { getRedisInstance: getRedisInstanceFresh, redisClient: freshRedisClient } = await import(
      "../../src/integration/redis/index.js"
    );
    const { logger } = await import("../../src/utils/logger.js");

    const loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const loggerInfoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});

    const client = getRedisInstanceFresh();

    // Trigger events
    client.emit("error", new Error("Test Redis Error"));
    client.emit("error", "String Redis Error");
    client.emit("connect");

    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Test Redis Error"));
    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining("String Redis Error"));
    expect(loggerInfoSpy).toHaveBeenCalledWith("Redis Client Connected Successfully");

    await freshRedisClient.disconnect();
    vi.doUnmock("../../src/config/env.js");
    vi.resetModules();
  });

  it("should ensure Supabase client is a singleton", () => {
    const client1 = getSupabaseInstance();
    const client2 = getSupabaseInstance();
    const client3 = supabaseClient.instance;

    expect(client1).toBeDefined();
    expect(client2).toBe(client1);
    expect(client3).toBe(client1);
  });

  it("should throw an error if Supabase credentials are missing", async () => {
    vi.resetModules();
    vi.doMock("../../src/config/env.js", () => ({
      loadEnv: () => ({
        SUPABASE_URL: undefined,
        SUPABASE_ANON_KEY: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }),
    }));

    const { getSupabaseInstance: getSupabaseInstanceFresh } = await import(
      "../../src/integration/database/index.js"
    );

    expect(() => getSupabaseInstanceFresh()).toThrowError(
      /Supabase credentials are not configured/,
    );

    vi.doUnmock("../../src/config/env.js");
    vi.resetModules();
  });

  it("should ensure Vector Embeddings client is a singleton", () => {
    const client1 = getEmbeddingsInstance();
    const client2 = getEmbeddingsInstance();
    const client3 = vectorEmbeddings.instance;

    expect(client1).toBeDefined();
    expect(client2).toBe(client1);
    expect(client3).toBe(client1);
  });

  it("should verify SupabaseVectorDB calls Supabase client methods correctly", async () => {
    const { SupabaseVectorDB, vectorEmbeddings: freshVectorEmbeddings } = await import(
      "../../src/integration/vectors/index.js"
    );
    const { supabaseClient: freshSupabaseClient } = await import(
      "../../src/integration/database/index.js"
    );

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.spyOn(freshSupabaseClient.instance, "from").mockReturnValue({
      insert: mockInsert,
    } as any);

    const mockRpc = vi.spyOn(freshSupabaseClient.instance, "rpc").mockResolvedValue({
      data: [{ content: "mocked match", similarity: 0.9 }],
      error: null,
    } as any);

    // Mock embedding calls
    const mockEmbedDocuments = vi
      .spyOn(freshVectorEmbeddings.instance, "embedDocuments")
      .mockResolvedValue([[0.1, 0.2]]);
    const mockEmbedQuery = vi
      .spyOn(freshVectorEmbeddings.instance, "embedQuery")
      .mockResolvedValue([0.1, 0.2]);

    const db = new SupabaseVectorDB("custom_table", "custom_rpc");

    // Test insert
    await db.insert([{ content: "hello", metadata: { key: "val" }, embedding: [0.1, 0.2] }]);
    expect(mockFrom).toHaveBeenCalledWith("custom_table");
    expect(mockInsert).toHaveBeenCalledWith([
      { content: "hello", metadata: { key: "val" }, embedding: [0.1, 0.2] },
    ]);

    // Test insertTexts (auto-embeds text)
    await db.insertTexts(["hello"], [{ key: "val" }]);
    expect(mockEmbedDocuments).toHaveBeenCalledWith(["hello"]);
    expect(mockInsert).toHaveBeenCalledWith([
      { content: "hello", metadata: { key: "val" }, embedding: [0.1, 0.2] },
    ]);

    // Test similaritySearch
    const results = await db.similaritySearch([0.1, 0.2], 3, 0.8);
    expect(mockRpc).toHaveBeenCalledWith("custom_rpc", {
      query_embedding: [0.1, 0.2],
      match_threshold: 0.8,
      match_count: 3,
    });
    expect(results).toEqual([{ content: "mocked match", similarity: 0.9 }]);

    // Test searchByText (auto-embeds query)
    const resultsByText = await db.searchByText("hello", 3, 0.8);
    expect(mockEmbedQuery).toHaveBeenCalledWith("hello");
    expect(mockRpc).toHaveBeenCalledWith("custom_rpc", {
      query_embedding: [0.1, 0.2],
      match_threshold: 0.8,
      match_count: 3,
    });
    expect(resultsByText).toEqual([{ content: "mocked match", similarity: 0.9 }]);

    mockFrom.mockRestore();
    mockRpc.mockRestore();
    mockEmbedDocuments.mockRestore();
    mockEmbedQuery.mockRestore();
  });
});
