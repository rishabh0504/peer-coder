import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { defaultToolRuntime } from "@runtime/tool_runtime.js";
import { ToolExecutionError } from "@utils/errors.js";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import * as cheerio from "cheerio";
import { z } from "zod";
import { WebToolError } from "./errors/web.errors.js";
import { validateUrl } from "./security/url-validator.js";

export const fetchWebpageSchema = z.object({
  url: z
    .string()
    .url("Invalid URL format")
    .describe("The direct URL of the webpage to fetch and scrape"),
});

export async function fetchWebpage(targetUrl: string): Promise<any> {
  let currentUrl = targetUrl;
  let redirectCount = 0;
  const maxRedirects = 3;

  let response!: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    while (redirectCount <= maxRedirects) {
      validateUrl(currentUrl);

      response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      // Redirect codes: 301, 302, 303, 307, 308
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new WebToolError(
            "FETCH_CONTENT_LIMIT_EXCEEDED",
            "Too many redirects followed (max 3).",
          );
        }

        const location = response.headers.get("location");
        if (!location) {
          throw new WebToolError(
            "FETCH_PROVIDER_ERROR",
            "Redirect response missing Location header.",
          );
        }

        // Resolve relative redirects
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      break;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new WebToolError(
        "FETCH_PROVIDER_ERROR",
        `HTTP fetch failed with status ${response.status}`,
        response.status,
      );
    }

    // Content Type Validation
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new WebToolError(
        "FETCH_INVALID_CONTENT_TYPE",
        `Invalid Content-Type: ${contentType}. Only text/html and application/xhtml+xml are supported.`,
      );
    }

    // Stream consumption with byte counting limits
    let html = "";
    if (response.body) {
      if (typeof (response.body as any).getReader === "function") {
        const reader = (response.body as any).getReader();
        let totalBytes = 0;
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              totalBytes += value.byteLength || value.length || 0;
              if (totalBytes > 2 * 1024 * 1024) {
                controller.abort();
                throw new WebToolError(
                  "FETCH_CONTENT_LIMIT_EXCEEDED",
                  "Webpage content size limit exceeded 2MB.",
                );
              }
              chunks.push(value);
            }
          }
        } finally {
          reader.releaseLock();
        }
        html = Buffer.concat(chunks).toString("utf-8");
      } else {
        let totalBytes = 0;
        const chunks: any[] = [];
        for await (const chunk of response.body as any) {
          totalBytes += chunk.length || 0;
          if (totalBytes > 2 * 1024 * 1024) {
            controller.abort();
            throw new WebToolError(
              "FETCH_CONTENT_LIMIT_EXCEEDED",
              "Webpage content size limit exceeded 2MB.",
            );
          }
          chunks.push(chunk);
        }
        html = Buffer.concat(chunks).toString("utf-8");
      }
    } else {
      html = await response.text();
    }

    // Cheerio DOM Extraction
    const $ = cheerio.load(html);
    const title = $("title").text().trim() || "Untitled Page";

    // Priority selector hierarchy
    const prioritySelectors = [
      "article",
      "main",
      ".content",
      ".markdown-body",
      ".theme-doc-markdown",
      ".md-content",
      "#content",
      "body",
    ];

    let $contentEl = $();
    for (const selector of prioritySelectors) {
      const $el = $(selector);
      if ($el.length) {
        $contentEl = $el;
        break;
      }
    }

    // Strip unwanted tags
    $contentEl
      .find("script, style, svg, head, iframe, nav, footer, header, noscript, form, button")
      .remove();

    const rawText = $contentEl.text().replace(/\s+/g, " ").trim();
    const truncated = rawText.length > 50000;
    const finalContent = truncated ? rawText.slice(0, 50000) : rawText;
    const wordCount = finalContent.split(/\s+/).filter(Boolean).length;

    return {
      url: currentUrl,
      title,
      content: finalContent,
      metadata: {
        fetchedAt: new Date().toISOString(),
        contentLength: Buffer.byteLength(html, "utf-8"),
        contentType,
        wordCount,
        truncated,
      },
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof WebToolError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new WebToolError("FETCH_TIMEOUT", "Webpage request timed out.");
    }
    throw new WebToolError(
      "FETCH_PROVIDER_ERROR",
      `Webpage fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// Helper wrapper to implement retry policies
export async function fetchWebpageWithRetry(targetUrl: string, retries = 2): Promise<any> {
  let attempts = 0;
  while (attempts <= retries) {
    try {
      return await fetchWebpage(targetUrl);
    } catch (err) {
      attempts++;
      const isTransient =
        err instanceof WebToolError &&
        (err.code === "FETCH_TIMEOUT" ||
          err.code === "SEARCH_TIMEOUT" ||
          (err.status && [502, 503, 504].includes(err.status)));

      if (!isTransient || attempts > retries) {
        throw err;
      }
    }
  }
}

export const fetchWebpageTool = tool(
  async (input, config?: RunnableConfig) => {
    const contextOverride = config?.configurable?.workspaceContext as WorkspaceContext | undefined;
    const response = await defaultToolRuntime.execute(
      "fetch_webpage",
      input,
      async (_context, args) => {
        const data = await fetchWebpageWithRetry(args.url);
        return data;
      },
      contextOverride,
    );

    if (!response.success || !response.data) {
      throw new ToolExecutionError(
        response.error?.message || "Failed to fetch webpage.",
        "fetch_webpage",
        response.error?.code || "EXECUTION_ERROR",
      );
    }

    return JSON.stringify(response.data);
  },
  {
    name: "fetch_webpage",
    description:
      "Fetch and clean the text content of a direct webpage/URL (removes navigation, sidebars, headers, styles, and script tags).",
    schema: fetchWebpageSchema,
  },
);
