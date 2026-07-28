import { searchDuckDuckGo, webSearchTool } from "@tools/web-search/web_search.js";
import { workspaceInfoTool } from "@tools/workspace/workspace_info.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("web-search & workspace Tools Suite", () => {
  const context = createDefaultWorkspaceContext();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockHtml = `
    <div class="result">
      <a class="result__a" href="/html/?uddg=https%3A%2F%2Fexample1.com%2Ffoo"><b>First</b> Example</a>
      <a class="result__snippet" href="/html/?uddg=https%3A%2F%2Fexample1.com%2Ffoo">Snippet <i>One</i></a>
    </div>
    <div class="result">
      <a class="result__a" href="/html/?uddg=https%3A%2F%2Fexample2.com">Second Page</a>
      <a class="result__snippet" href="/html/?uddg=https%3A%2F%2Fexample2.com">Snippet Two</a>
    </div>
  `;

  it("should parse DuckDuckGo HTML results correctly and strip tags", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as Response);

    const results = await searchDuckDuckGo("test query", 5);
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("First Example");
    expect(results[0].url).toBe("https://example1.com/foo");
    expect(results[0].snippet).toBe("Snippet One");

    expect(results[1].title).toBe("Second Page");
    expect(results[1].url).toBe("https://example2.com");
    expect(results[1].snippet).toBe("Snippet Two");

    fetchMock.mockRestore();
  });

  it("should respect maxResults limit in helper and tool", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as Response);

    const results = await searchDuckDuckGo("test query", 1);
    expect(results).toHaveLength(1);

    const toolResult = await webSearchTool.invoke(
      { query: "test query", maxResults: 1 },
      { configurable: { workspaceContext: context } },
    );
    const parsed = JSON.parse(toolResult);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.totalResults).toBe(1);

    fetchMock.mockRestore();
  });

  it("should validate web_search return shape and empty results", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "no results here",
    } as Response);

    const result = await webSearchTool.invoke(
      { query: "empty query" },
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.query).toBe("empty query");
    expect(parsed.totalResults).toBe(0);
    expect(parsed.results).toEqual([]);

    fetchMock.mockRestore();
  });

  it("should throw error when DuckDuckGo returns non-200 status", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(
      webSearchTool.invoke({ query: "fail" }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow(/HTTP request failed with status 503/);

    fetchMock.mockRestore();
  });

  it("should throw error when fetch throws network error", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));

    await expect(
      webSearchTool.invoke({ query: "fail" }, { configurable: { workspaceContext: context } }),
    ).rejects.toThrow(/Network Error/);

    fetchMock.mockRestore();
  });

  it("should execute workspace_info tool and return context metadata with correct shape", async () => {
    const result = await workspaceInfoTool.invoke(
      {},
      { configurable: { workspaceContext: context } },
    );

    const parsed = JSON.parse(result);
    expect(parsed.workspaceRoot).toBe(context.workspaceRoot);
    expect(parsed.permissions).toBeDefined();
    expect(parsed).toHaveProperty("workspaceRoot");
    expect(parsed).toHaveProperty("permissions");
    expect(parsed).toHaveProperty("maxFileSizeByte");
  });
});
