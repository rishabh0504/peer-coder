import { describe, expect, it, vi } from "vitest";
import { boundModel, chatStream } from "../../src/integration/llms/index.js";
import { interact } from "../../src/integration/llms/interact.js";
import { ollamaInstance } from "../../src/providers/ollama/index.js";

import { HumanMessage } from "@langchain/core/messages";

describe("Integration & Providers Unit Test Suite", () => {
  it("should verify ollamaInstance and boundModel initialization", () => {
    expect(ollamaInstance).toBeDefined();
    expect(boundModel).toBeDefined();
  });

  it("should test chatStream function with string input", async () => {
    const streamSpy = vi.spyOn(boundModel, "stream").mockResolvedValue(["chunk1"] as any);
    const result = await chatStream("Hello model");

    expect(streamSpy).toHaveBeenCalled();
    expect(result).toBeDefined();
    streamSpy.mockRestore();
  });

  it("should test chatStream function with BaseMessage[] input", async () => {
    const streamSpy = vi.spyOn(boundModel, "stream").mockResolvedValue(["chunk1"] as any);
    const result = await chatStream([new HumanMessage("Hello message list")]);

    expect(streamSpy).toHaveBeenCalled();
    expect(result).toBeDefined();
    streamSpy.mockRestore();
  });

  it("should test interact loop with mocked chatStream", async () => {
    const fakeStream = (async function* () {
      yield {
        content: "I will read the file for you. ",
        tool_calls: [
          {
            id: "tc_1",
            name: "workspace_info",
            args: {},
          },
        ],
      };
    })();

    const integrationModule = await import("../../src/integration/llms/index.js");
    const chatStreamSpy = vi
      .spyOn(integrationModule, "chatStream")
      .mockResolvedValue(fakeStream as any);

    await interact("Show workspace info");
    chatStreamSpy.mockRestore();
  });

  it("should test interact loop with plain text only (no tools)", async () => {
    const fakeStream = (async function* () {
      yield {
        content: "This is a plain text answer.",
      };
    })();

    const integrationModule = await import("../../src/integration/llms/index.js");
    const chatStreamSpy = vi
      .spyOn(integrationModule, "chatStream")
      .mockResolvedValue(fakeStream as any);

    await interact("Plain prompt");
    chatStreamSpy.mockRestore();
  });

  it("should test interact loop in debug mode with tools", async () => {
    const originalDebug = process.env.DEBUG;
    process.env.DEBUG = "true";

    const fakeStream = (async function* () {
      yield {
        tool_calls: [
          {
            id: "tc_2",
            name: "workspace_info",
            args: {},
          },
        ],
      };
      yield {
        content: "Extra debug content",
      };
    })();

    const integrationModule = await import("../../src/integration/llms/index.js");
    const chatStreamSpy = vi
      .spyOn(integrationModule, "chatStream")
      .mockResolvedValue(fakeStream as any);

    const parserModule = await import("../../src/utils/tool-parser.js");
    const parseSpy = vi.spyOn(parserModule, "parseToolCall").mockReturnValue(null);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await interact("Show workspace info debug");

    expect(consoleSpy).toHaveBeenCalled();

    process.env.DEBUG = originalDebug;
    chatStreamSpy.mockRestore();
    parseSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("should test interact loop with empty stream", async () => {
    const fakeStream = (async function* () {
      // Yield nothing
    })();

    const integrationModule = await import("../../src/integration/llms/index.js");
    const chatStreamSpy = vi
      .spyOn(integrationModule, "chatStream")
      .mockResolvedValue(fakeStream as any);

    await interact("Empty prompt");
    chatStreamSpy.mockRestore();
  });

  it("should test interact loop when stream throws an error", async () => {
    const integrationModule = await import("../../src/integration/llms/index.js");
    const chatStreamSpy = vi
      .spyOn(integrationModule, "chatStream")
      .mockRejectedValue(new Error("Stream Error"));

    await expect(interact("Throw error prompt")).rejects.toThrow("Stream Error");
    chatStreamSpy.mockRestore();
  });
});
