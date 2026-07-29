import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "../../src/config/env.js";

describe("env config unit tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should process OLLAMA_LOCAL and DEBUG boolean conversions correctly", () => {
    process.env.OLLAMA_LOCAL = "false";
    process.env.DEBUG = "true";

    const env = loadEnv();
    expect(env.OLLAMA_LOCAL).toBe(false);
    expect(env.DEBUG).toBe(true);
  });

  it("should process OLLAMA_LOCAL and DEBUG with lowercase true/false string values", () => {
    process.env.OLLAMA_LOCAL = "TRUE";
    process.env.DEBUG = "FALSE";

    const env = loadEnv();
    expect(env.OLLAMA_LOCAL).toBe(true);
    expect(env.DEBUG).toBe(false);
  });

  it("should handle non-boolean values for preprocess return branch coverage", () => {
    // If not a string "true"/"false", it should return the original value and let Zod validate
    process.env.OLLAMA_LOCAL = "invalid_bool";

    // We mock console.error to avoid spamming output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const env = loadEnv();
    expect(consoleSpy).toHaveBeenCalled();
    // Because validation failed, it falls back to default values
    expect(env.OLLAMA_LOCAL).toBe(true);
  });

  it("should fall back to defaults and log error when validation fails on invalid URL", () => {
    process.env.SUPABASE_URL = "not-a-url";

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const env = loadEnv();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid environment configuration:",
      expect.any(Object),
    );
    expect(env.SUPABASE_URL).toBeUndefined();
  });
});
