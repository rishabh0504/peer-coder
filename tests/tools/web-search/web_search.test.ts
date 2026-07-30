import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchDuckDuckGo, webSearchTool } from "../../../src/tools/web-search/web_search.js";

describe("Web Search Tool", () => {
  const context = createDefaultWorkspaceContext();
  const config = { configurable: { workspaceContext: context } };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should successfully search and return normalized results", async () => {
    const mockHtml = `
      <div class="result">
        <a class="result__a" href="/html/?q=test&uddg=https%3A%2F%2Fexample.com">Example Title</a>
        <span class="result__snippet">Example Snippet</span>
      </div>
    `;

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const result = await searchDuckDuckGo("test query", 1);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Example Title");
    expect(result[0].url).toBe("https://example.com");

    // Test tool invocation
    const toolResult = await webSearchTool.invoke({ query: "test query", maxResults: 1 }, config);
    expect(JSON.parse(toolResult).results).toHaveLength(1);
  });

  it("should reject query inputs that fail Zod schema limits", async () => {
    // query too short
    await expect(webSearchTool.invoke({ query: "a" }, config)).rejects.toThrow();

    // query too long
    await expect(webSearchTool.invoke({ query: "a".repeat(501) }, config)).rejects.toThrow();

    // maxResults out of bounds
    await expect(
      webSearchTool.invoke({ query: "test query", maxResults: 25 }, config),
    ).rejects.toThrow();
  });

  it("should throw SEARCH_PROVIDER_ERROR when HTTP request fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    await expect(searchDuckDuckGo("test")).rejects.toThrow(/HTTP request failed with status 500/);
  });

  it("should throw SEARCH_TIMEOUT when request aborts due to timeout", async () => {
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";

    vi.mocked(fetch).mockRejectedValue(abortError);

    await expect(searchDuckDuckGo("test")).rejects.toThrow("DuckDuckGo search request timed out.");
  });

  it("should throw SEARCH_PROVIDER_ERROR when general error occurs", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network disconnect"));

    await expect(searchDuckDuckGo("test")).rejects.toThrow("DuckDuckGo search failed");
  });
});
