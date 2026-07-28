import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env.js";
import { CLIError } from "../src/utils/errors.js";

describe("Environment Loader", () => {
  it("should load environment defaults", () => {
    const env = loadEnv();
    expect(env.NODE_ENV).toBeDefined();
    expect(["development", "production", "test"]).toContain(env.NODE_ENV);
  });
});

describe("CLI Errors", () => {
  it("should format custom CLI error", () => {
    const err = new CLIError("Test error message", 2);
    expect(err.message).toBe("Test error message");
    expect(err.exitCode).toBe(2);
    expect(err.name).toBe("CLIError");
  });
});
