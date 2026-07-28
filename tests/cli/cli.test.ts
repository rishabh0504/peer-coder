import * as clackPrompts from "@clack/prompts";
import { printBrandBanner } from "@cli/brand.js";
import { infoCommand } from "@cli/info.js";
import { startRepl } from "@cli/repl.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => {
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    note: vi.fn(),
    text: vi.fn(),
    isCancel: vi.fn().mockImplementation((val) => val === "CANCEL_TOKEN"),
  };
});

vi.mock("../src/integration/interact.js", () => ({
  interact: vi.fn().mockImplementation(() => Promise.resolve()),
}));

describe("CLI Module Suite (brand, info, repl)", () => {
  it("should render printBrandBanner without throwing", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    printBrandBanner();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should render infoCommand without throwing", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    infoCommand();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should test startRepl commands with @clack/prompts", async () => {
    const textMock = vi.mocked(clackPrompts.text);

    textMock
      .mockResolvedValueOnce("/info")
      .mockResolvedValueOnce("/help")
      .mockResolvedValueOnce("/clear")
      .mockResolvedValueOnce("Explain async/await")
      .mockResolvedValueOnce("CANCEL_TOKEN");

    await startRepl();

    expect(textMock).toHaveBeenCalledTimes(5);

    vi.restoreAllMocks();
  });
});
