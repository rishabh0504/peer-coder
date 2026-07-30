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

  it("should throw WebToolError when bot detection CAPTCHA is present", () => {
    const htmlWithCaptcha =
      "<html><div class='anomaly-modal'>Please confirm this search was made by a human</div></html>";
    expect(() => parseDuckDuckGoHtml(htmlWithCaptcha)).toThrowError(
      "DuckDuckGo search was blocked by a bot detection CAPTCHA challenge.",
    );
  });

  it("should handle redirection decoding errors gracefully", () => {
    const htmlWithBadRedirect = `
      <div class="result">
        <a class="result__a" href="/l/?kh=-1&uddg=http%3A%2F%2F[invalid-url-domain]">Bad Redirect</a>
        <div class="result__snippet">bad redirect snippet</div>
      </div>
    `;
    const results = parseDuckDuckGoHtml(htmlWithBadRedirect);
    expect(results).toHaveLength(0); // Ignored due to validation/decode error
  });

  it("should ignore invalid/blocked URLs gracefully", () => {
    const htmlWithBlockedUrl = `
      <div class="result">
        <a class="result__a" href="http://127.0.0.1/local-service">Local IP</a>
        <div class="result__snippet">local ip snippet</div>
      </div>
    `;
    const results = parseDuckDuckGoHtml(htmlWithBlockedUrl);
    expect(results).toHaveLength(0);
  });

  it("should skip duplicate URLs", () => {
    const htmlWithDuplicates = `
      <div class="result">
        <a class="result__a" href="https://example.com/page1">Example Page 1</a>
        <div class="result__snippet">Snippet 1</div>
      </div>
      <div class="result">
        <a class="result__a" href="https://example.com/page1">Example Page 1 Dupe</a>
        <div class="result__snippet">Snippet 2</div>
      </div>
    `;
    const results = parseDuckDuckGoHtml(htmlWithDuplicates);
    expect(results).toHaveLength(1);
  });

  it("should skip results with missing href attributes", () => {
    const htmlWithMissingHref = `
      <div class="result">
        <a class="result__a">No Href Link</a>
        <div class="result__snippet">Snippet</div>
      </div>
    `;
    const results = parseDuckDuckGoHtml(htmlWithMissingHref);
    expect(results).toHaveLength(0);
  });
});
