import { describe, expect, it } from "vitest";
import {
  DetectingLanguageServerAdapter,
  preferLspHits,
} from "../../src/code_intel/lsp/detecting_adapter.js";

describe("DetectingLanguageServerAdapter", () => {
  it("elevates hits when a matching server is present", () => {
    const adapter = new DetectingLanguageServerAdapter(["typescript-language-server"]);
    expect(adapter.hasServerForFile("src/foo.ts")).toBe(true);
    expect(adapter.hasServerForFile("src/foo.py")).toBe(false);
    const hits = preferLspHits(adapter, [
      { filePath: "a.ts", confidence: "medium", source: "l3-edge" },
      { filePath: "b.py", confidence: "medium", source: "rg" },
    ]);
    expect(hits[0]?.source).toBe("lsp");
    expect(hits[0]?.confidence).toBe("high");
    expect(hits[1]?.filePath).toBe("b.py");
  });

  it("leaves hits unchanged when no servers", () => {
    const adapter = new DetectingLanguageServerAdapter([]);
    const hits = [{ filePath: "a.ts", confidence: "low", source: "rg" }];
    expect(preferLspHits(adapter, hits)).toEqual(hits);
  });
});
