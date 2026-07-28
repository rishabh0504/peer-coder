import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { z } from "zod";

export const webSearchInputSchema = z.object({
  query: z.string().describe("Search query for web search"),
  maxResults: z
    .number()
    .optional()
    .default(5)
    .describe("Maximum number of search results to return"),
});

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Perform zero-API-key web search via DuckDuckGo HTML endpoint.
 */
export async function searchDuckDuckGo(query: string, maxResults = 5): Promise<SearchResultItem[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search HTTP request failed with status ${response.status}`);
  }

  const html = await response.text();
  const results: SearchResultItem[] = [];

  const resultTitleRegex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

  // Extract titles & URLs
  const titleMatches: Array<{ title: string; url: string }> = [];
  let titleMatch = resultTitleRegex.exec(html);
  while (titleMatch !== null) {
    const rawUrl = titleMatch[1] || "";
    let cleanUrl = rawUrl;
    if (rawUrl.includes("uddg=")) {
      const parsedUrlParam = new URLSearchParams(rawUrl.split("?")[1]).get("uddg");
      if (parsedUrlParam) cleanUrl = decodeURIComponent(parsedUrlParam);
    }
    const cleanTitle = (titleMatch[2] || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanUrl && cleanTitle) {
      titleMatches.push({ title: cleanTitle, url: cleanUrl });
    }
    titleMatch = resultTitleRegex.exec(html);
  }

  // Extract snippets
  const snippetMatches: string[] = [];
  const snippetRegex = /<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let snippetMatch = snippetRegex.exec(html);
  while (snippetMatch !== null) {
    const cleanSnippet = (snippetMatch[1] || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    snippetMatches.push(cleanSnippet);
    snippetMatch = snippetRegex.exec(html);
  }

  for (let i = 0; i < Math.min(titleMatches.length, maxResults); i++) {
    const titleObj = titleMatches[i];
    if (titleObj) {
      results.push({
        title: titleObj.title,
        url: titleObj.url,
        snippet: snippetMatches[i] || "",
      });
    }
  }

  return results;
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
