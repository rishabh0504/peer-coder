import * as cheerio from "cheerio";
import { normalizeUrl, validateUrl } from "../security/url-validator.js";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export function parseDuckDuckGoHtml(html: string): SearchResultItem[] {
  const $ = cheerio.load(html);
  const results: SearchResultItem[] = [];
  const processedUrls = new Set<string>();

  $(".result").each((_, element) => {
    const $element = $(element);
    const $link = $element.find(".result__a");
    const rawHref = $link.attr("href") || "";

    if (!rawHref) return;

    let cleanUrl = rawHref;
    try {
      if (rawHref.includes("uddg=")) {
        const urlObj = new URL(`https://html.duckduckgo.com${rawHref}`);
        const uddg = urlObj.searchParams.get("uddg");
        if (uddg) {
          cleanUrl = decodeURIComponent(uddg);
        }
      }
    } catch {
      // Fallback to rawHref
    }

    let normalized: string;
    try {
      normalized = normalizeUrl(cleanUrl);
      validateUrl(normalized);
    } catch {
      // Ignore invalid or blocked URLs to remain resilient
      return;
    }

    if (processedUrls.has(normalized)) {
      return;
    }
    processedUrls.add(normalized);

    const title = $link.text().trim() || "";
    const snippet = $element.find(".result__snippet").text().trim() || "";

    if (title && normalized) {
      results.push({
        title,
        url: normalized,
        snippet,
      });
    }
  });

  return results;
}
