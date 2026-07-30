import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { z } from "zod";
import { WebToolError } from "./errors/web.errors.js";
import { parseDuckDuckGoHtml } from "./parser/duckduckgo.parser.js";

export const webSearchInputSchema = z.object({
  query: z
    .string()
    .min(2, "Query must be at least 2 characters")
    .max(500, "Query cannot exceed 500 characters")
    .describe("Search query for web search"),
  maxResults: z
    .number()
    .int()
    .min(1, "maxResults must be at least 1")
    .max(20, "maxResults cannot exceed 20")
    .optional()
    .default(5)
    .describe("Maximum number of search results to return"),
});

export async function searchDuckDuckGo(query: string, maxResults = 5): Promise<any> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new WebToolError(
        "SEARCH_PROVIDER_ERROR",
        `DuckDuckGo search HTTP request failed with status ${response.status}`,
        response.status,
      );
    }

    const html = await response.text();
    const results = parseDuckDuckGoHtml(html);
    return results.slice(0, maxResults);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof WebToolError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new WebToolError("SEARCH_TIMEOUT", "DuckDuckGo search request timed out.");
    }
    throw new WebToolError(
      "SEARCH_PROVIDER_ERROR",
      `DuckDuckGo search failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export const webSearchTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "web_search",
      input,
      async (_context, args) => {
        const results = await searchDuckDuckGo(args.query, args.maxResults);
        return {
          query: args.query,
          totalResults: results.length,
          results,
        };
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to perform web search.",
        "web_search",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "web_search",
    description:
      "Search DuckDuckGo web resources for live information, documentation, and external answers (No API key required).",
    schema: webSearchInputSchema,
  },
);
