import { CLIError, handleError } from "@utils/errors.js";
import { logger } from "@utils/logger.js";
import { startAgentSpinner, stopAgentSpinner, updateAgentSpinner } from "@utils/spinner.js";
import { parseToolCall } from "@utils/tool-parser.js";
import { describe, expect, it, vi } from "vitest";

describe("Utils Unit Test Suite", () => {
  it("should test CLIError and handleError including DEBUG stack trace", () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    const cliErr = new CLIError("Custom CLI Error", 2);
    expect(cliErr.exitCode).toBe(2);

    handleError(cliErr);
    expect(errorSpy).toHaveBeenCalledWith("Custom CLI Error");
    expect(exitSpy).toHaveBeenCalledWith(2);

    // Test with process.env.DEBUG = "true"
    const oldDebug = process.env.DEBUG;
    process.env.DEBUG = "true";
    const stdErr = new Error("Standard error message");
    handleError(stdErr);
    expect(errorSpy).toHaveBeenCalledWith("Unexpected Error: Standard error message");
    expect(consoleErrorSpy).toHaveBeenCalled();
    process.env.DEBUG = oldDebug;

    handleError("String error");
    expect(errorSpy).toHaveBeenCalledWith("An unknown error occurred: String error");

    errorSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should test logger utility methods", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.info("info msg");
    logger.success("success msg");
    logger.warn("warn msg");
    logger.error("error msg");
    logger.step(1, 3, "step msg");
    logger.dim("dim msg");
    expect(logger.bold("bold msg")).toBeDefined();

    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("should test spinner lifecycle and fallback paths", () => {
    const oldDebug = process.env.DEBUG;
    process.env.DEBUG = "true";

    try {
      // Start initial spinner
      const spinner = startAgentSpinner("Thinking", "details info");
      expect(spinner).toBeDefined();

      // Start second spinner when one is already active (tests activeSpinner.stop())
      startAgentSpinner("Analyzing", "more details");

      updateAgentSpinner("Executing", "new details");

      stopAgentSpinner(true, "All done");

      // Stop spinner again when activeSpinner is null
      stopAgentSpinner(true);

      // Test updateAgentSpinner when activeSpinner is null
      updateAgentSpinner("Validating");
      stopAgentSpinner(false, "Failed step");

      // Test stopAgentSpinner false without custom message
      startAgentSpinner("Reasoning");
      stopAgentSpinner(false);
    } finally {
      process.env.DEBUG = oldDebug;
    }
  });

  it("should test tool-parser native and text fallback parsing", () => {
    // Native call with id provided vs omitted
    const nativeResultWithId = parseToolCall([
      { id: "custom_id", name: "read_file", args: { path: "a.ts" } },
    ]);
    expect(nativeResultWithId?.id).toBe("custom_id");

    const nativeResultNoId = parseToolCall([{ name: "read_file", args: { path: "a.ts" } }]);
    expect(nativeResultNoId?.name).toBe("read_file");

    // Markdown JSON block fallback
    const jsonBlock =
      '```json\n{\n  "tool": "create_file",\n  "arguments": { "path": "b.ts" }\n}\n```';
    const parsedBlock = parseToolCall(undefined, jsonBlock);
    expect(parsedBlock?.name).toBe("create_file");

    // Fallback JSON with path/filePath/startLine/endLine fallback arguments
    const jsonBlockFallbackArgs =
      '```json\n{\n  "tool": "read_file",\n  "filePath": "c.ts",\n  "startLine": 1,\n  "endLine": 10\n}\n```';
    const parsedFallbackArgs = parseToolCall(undefined, jsonBlockFallbackArgs);
    expect(parsedFallbackArgs?.name).toBe("read_file");
    expect(parsedFallbackArgs?.args.startLine).toBe(1);

    // Inline JSON match fallback with tool name
    const inlineJson =
      'Here is my tool call: {"tool": "delete_file", "path": "c.ts", "arguments": { "path": "c.ts" }}';
    const parsedInline = parseToolCall(undefined, inlineJson);
    expect(parsedInline?.name).toBe("delete_file");

    // Null cases
    expect(parseToolCall(undefined, "no json here")).toBeNull();
    expect(parseToolCall(undefined, "```json\ninvalid json\n```")).toBeNull();
  });
});
