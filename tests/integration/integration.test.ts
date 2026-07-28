import { describe, expect, it, vi } from "vitest";
import { boundModel, chatStream } from "../../src/integration/index.js";
import { interact } from "../../src/integration/interact.js";
import { ollamaInstance } from "../../src/providers/ollama/index.js";

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

    const integrationModule = await import("../../src/integration/index.js");
    vi.spyOn(integrationModule, "chatStream").mockResolvedValue(fakeStream as any);

    await interact("Show workspace info");
  });
});
