import EventEmitter from "node:events";
import { printBrandBanner } from "@cli/brand.js";
import { infoCommand } from "@cli/info.js";
import { startRepl } from "@cli/repl.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/integration/interact.js", () => ({
  interact: vi.fn().mockResolvedValue("mocked response"),
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

  it("should test startRepl commands", async () => {
    class MockReadline extends EventEmitter {
      prompt = vi.fn();
      pause = vi.fn();
      resume = vi.fn();
    }

    const mockRl = new MockReadline();
    vi.spyOn(require("node:readline"), "createInterface").mockReturnValue(mockRl as any);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    void startRepl();

    // Trigger empty line
    mockRl.emit("line", "");

    // Trigger /info
    mockRl.emit("line", "/info");

    // Trigger /help
    mockRl.emit("line", "/help");

    // Trigger /clear
    mockRl.emit("line", "/clear");

    // Trigger normal user input (AI prompt)
    await mockRl.emit("line", "Explain async/await");

    // Trigger /exit
    mockRl.emit("line", "/exit");
    expect(exitSpy).toHaveBeenCalledWith(0);

    // Trigger close
    mockRl.emit("close");

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
