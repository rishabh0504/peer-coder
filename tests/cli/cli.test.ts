import * as prompts from "@clack/prompts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { printBrandBanner } from "../../src/cli/brand.js";
import { infoCommand } from "../../src/cli/info.js";
import { orchestrateCommand } from "../../src/cli/orchestrate.js";
import { startRepl } from "../../src/cli/repl.js";
import { loadEnv } from "../../src/core/config/env.js";
import { CLIError } from "../../src/core/utils/errors.js";
import { interact } from "../../src/integration/llms/interact.js";

// Mock clack prompts and interact
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  isCancel: vi.fn((val) => val === "__CANCEL__"),
  text: vi.fn(),
}));

vi.mock("../../src/integration/llms/interact.js", () => ({
  interact: vi.fn(),
}));

vi.mock("../../src/cli/orchestrate.js", () => ({
  orchestrateCommand: vi.fn(),
}));

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

describe("CLI Module Suite (brand, info, repl)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should print brand banner to stdout", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    printBrandBanner();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should output info command details to console", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    infoCommand();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should test startRepl commands with @clack/prompts", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const clearSpy = vi.spyOn(console, "clear").mockImplementation(() => {});

    // Mock sequence of user inputs
    // 1. "/help"
    // 2. "/info"
    // 3. "/clear"
    // 4. "valid prompt" (orchestrate succeeds)
    // 5. "error prompt" (orchestrate fails)
    // 6. "/exit" (loops terminate)
    const inputs = ["/help", "/info", "/clear", "build something", "cause error", "/exit"];
    let inputIndex = 0;
    vi.mocked(prompts.text).mockImplementation((async (options: any) => {
      // Test validator logic
      if (options.validate) {
        expect(options.validate("")).toBe("Please enter a non-empty prompt or command.");
        expect(options.validate("   ")).toBe("Please enter a non-empty prompt or command.");
        expect(options.validate("valid")).toBeUndefined();
      }
      return inputs[inputIndex++];
    }) as any);

    vi.mocked(orchestrateCommand).mockImplementation(async (_path, cmd) => {
      if (cmd === "cause error") {
        throw new Error("REPL string error");
      }
      return Promise.resolve();
    });

    await startRepl();

    expect(prompts.intro).toHaveBeenCalled();
    expect(prompts.note).toHaveBeenCalled();
    expect(prompts.outro).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(orchestrateCommand).toHaveBeenCalledTimes(2);
    expect(interact).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    clearSpy.mockRestore();
  });

  it("should exit immediately when 'exit' command is entered", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(prompts.text).mockResolvedValue("exit");

    await startRepl();
    expect(prompts.outro).toHaveBeenCalledWith("Goodbye! 👋");
    consoleSpy.mockRestore();
  });

  it("should exit immediately when REPL is cancelled by user", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(prompts.text).mockResolvedValue("__CANCEL__");

    await startRepl();
    expect(prompts.outro).toHaveBeenCalledWith("Session cancelled. Goodbye! 👋");
    consoleSpy.mockRestore();
  });
});
