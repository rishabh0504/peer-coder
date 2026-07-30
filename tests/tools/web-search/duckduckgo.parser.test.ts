import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDuckDuckGoHtml } from "../../../src/tools/web-search/parser/duckduckgo.parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("DuckDuckGo HTML Parser", () => {
  it("should extract, normalize and filter search results from fixture", async () => {
    const fixturePath = path.resolve(__dirname, "./fixtures/duckduckgo.html");
    const html = await fs.readFile(fixturePath, "utf-8");

    const results = parseDuckDuckGoHtml(html);

    // Should have extracted page 1 and page 2, skipped duplicate and loopback
    expect(results).toHaveLength(2);

    expect(results[0]?.url).toBe("https://example.com/page1");
    expect(results[0]?.title).toBe("Example Page 1");
    expect(results[0]?.snippet).toBe("Snippet text for example page 1.");

    expect(results[1]?.url).toBe("https://example.com/page2");
    expect(results[1]?.title).toBe("Example Page 2");
    expect(results[1]?.snippet).toBe("Snippet text for example page 2.");
  });
});
