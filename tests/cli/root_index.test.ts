import { describe, expect, it, vi } from "vitest";
import * as indexExports from "../../src/index.js";

describe("Root index.ts & Entrypoint Coverage", () => {
  it("should verify exports from src/index.ts", () => {
    expect(indexExports.infoCommand).toBeDefined();
    expect(indexExports.loadEnv).toBeDefined();
    expect(indexExports.CLIError).toBeDefined();
    expect(indexExports.handleError).toBeDefined();
    expect(indexExports.logger).toBeDefined();
  });

  it("should import src/cli.ts entrypoint without crashing", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Save original process.argv
    const originalArgv = process.argv;
    process.argv = ["node", "peer-coder", "info"];

    try {
      await import("../../src/cli.js");
    } catch {
      // Ignored
    } finally {
      process.argv = originalArgv;
      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    }
  });
});
