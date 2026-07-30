import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main, program } from "../../src/cli.js";

// Mock submodules
vi.mock("../../src/cli/info.js", () => ({
  infoCommand: vi.fn(),
}));

vi.mock("../../src/cli/repl.js", () => ({
  startRepl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/core/utils/errors.js", () => ({
  handleError: vi.fn(),
}));

vi.mock("../../src/core/utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("CLI entrypoint (src/cli.ts) Suite", () => {
  let exitSpy: any;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("should run startRepl when argv length <= 2 in main()", async () => {
    await main(["node", "peer-coder"]);

    const { startRepl } = await import("../../src/cli/repl.js");
    expect(startRepl).toHaveBeenCalled();
  });

  it("should run infoCommand when 'info' argument is parsed", async () => {
    await main(["node", "peer-coder", "info"]);

    const { infoCommand } = await import("../../src/cli/info.js");
    expect(infoCommand).toHaveBeenCalled();
  });

  it("should handle error when infoCommand throws", async () => {
    const { infoCommand } = await import("../../src/cli/info.js");
    vi.mocked(infoCommand).mockImplementationOnce(() => {
      throw new Error("mocked info error");
    });

    await main(["node", "peer-coder", "info"]);

    const { handleError } = await import("../../src/core/utils/errors.js");
    expect(handleError).toHaveBeenCalled();
  });

  it("should handle unknown command by logging error and exiting", async () => {
    // @ts-expect-error - emit is not typed on Command but exists at runtime
    program.emit("command:*", ["unknown_subcommand"]);

    const { logger } = await import("../../src/core/utils/logger.js");
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Unknown command"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should run startRepl when repl command is parsed", async () => {
    await main(["node", "peer-coder", "repl"]);

    const { startRepl } = await import("../../src/cli/repl.js");
    expect(startRepl).toHaveBeenCalled();
  });

  it("should handle error when startRepl throws in repl action", async () => {
    const { startRepl } = await import("../../src/cli/repl.js");
    vi.mocked(startRepl).mockImplementationOnce(() => {
      throw new Error("mocked repl error");
    });

    // Directly trigger action to cover catch block of the action
    await program.parseAsync(["node", "peer-coder", "repl"]);

    const { handleError } = await import("../../src/core/utils/errors.js");
    expect(handleError).toHaveBeenCalled();
  });

  it("should handle error in main catch block", async () => {
    const parseSpy = vi.spyOn(program, "parseAsync").mockRejectedValueOnce(new Error("Parse fail"));

    await main(["node", "peer-coder", "info"]);

    const { handleError } = await import("../../src/core/utils/errors.js");
    expect(handleError).toHaveBeenCalled();
    parseSpy.mockRestore();
  });

  it("should trigger main auto-run when NODE_ENV is not test", async () => {
    vi.resetModules();
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    // Dynamically import src/cli.ts to execute the auto-run logic
    await import("../../src/cli.js");

    const { startRepl } = await import("../../src/cli/repl.js");
    expect(startRepl).toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
  });
});
