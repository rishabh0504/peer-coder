import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultWorkspaceContext } from "@workspace/context/workspace_context.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchWebpageTool,
  fetchWebpageWithRetry,
} from "../../../src/tools/web-search/fetch_webpage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Fetch Webpage Tool", () => {
  const context = createDefaultWorkspaceContext();
  const config = { configurable: { workspaceContext: context } };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should successfully fetch and extract content from documentation HTML", async () => {
    const fixturePath = path.resolve(__dirname, "./fixtures/documentation.html");
    const htmlContent = await fs.readFile(fixturePath, "utf-8");

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "text/html"]]),
      text: async () => htmlContent,
    } as any);

    const result = await fetchWebpageWithRetry("https://example.com/docs");

    expect(result.title).toBe("Doc Page Title");
    expect(result.content).toContain("Documentation text content that should be returned.");
    expect(result.content).not.toContain("Header content to strip");
    expect(result.content).not.toContain("strip me");
    expect(result.metadata.wordCount).toBeGreaterThan(0);

    // Tool invoke check
    const toolResult = await fetchWebpageTool.invoke({ url: "https://example.com/docs" }, config);
    expect(JSON.parse(toolResult).title).toBe("Doc Page Title");
  });

  it("should reject unsafe loopback / local IP fetches", async () => {
    await expect(fetchWebpageWithRetry("http://localhost:3000/admin")).rejects.toThrow(
      /Blocked host/,
    );
  });

  it("should reject non-html content types", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "image/png"]]),
      text: async () => "",
    } as any);

    await expect(fetchWebpageWithRetry("https://example.com/image.png")).rejects.toThrow(
      /Invalid Content-Type/i,
    );
  });

  it("should follow redirects up to maxRedirects limit", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        status: 302,
        headers: new Map([["location", "/redirect-1"]]),
      } as any)
      .mockResolvedValueOnce({
        status: 301,
        headers: new Map([["location", "https://example.com/target"]]),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => "<title>Target page</title><body>Content</body>",
      } as any);

    const result = await fetchWebpageWithRetry("https://example.com/start");
    expect(result.url).toBe("https://example.com/target");
    expect(result.title).toBe("Target page");
  });

  it("should fail when redirect limit is exceeded", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 302,
      headers: new Map([["location", "/loop"]]),
    } as any);

    await expect(fetchWebpageWithRetry("https://example.com/start")).rejects.toThrow(
      /Too many redirects/i,
    );
  });

  it("should enforce size limits when downloading streaming body chunks", async () => {
    const chunk1 = new Uint8Array(1.5 * 1024 * 1024); // 1.5MB
    const chunk2 = new Uint8Array(1 * 1024 * 1024); // 1MB (Total 2.5MB)

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunk1 })
        .mockResolvedValueOnce({ done: false, value: chunk2 }),
      releaseLock: vi.fn(),
    };

    const mockBody = {
      getReader: () => mockReader,
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "text/html"]]),
      body: mockBody,
    } as any);

    await expect(fetchWebpageWithRetry("https://example.com/huge")).rejects.toThrow(
      /size limit exceeded/i,
    );
  });

  it("should retry transient HTTP failures", async () => {
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";

    const fetchMock = vi
      .mocked(fetch)
      .mockRejectedValueOnce(abortError) // first transient error (timeout)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => "<title>Success Page</title>",
      } as any);

    const result = await fetchWebpageWithRetry("https://example.com/retry");
    expect(result.title).toBe("Success Page");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should handle Node-style streams when downloading body", async () => {
    const chunk = Buffer.from("Node stream content");
    const mockBody = {
      [Symbol.asyncIterator]: async function* () {
        yield chunk;
      },
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "text/html"]]),
      body: mockBody,
    } as any);

    const result = await fetchWebpageWithRetry("https://example.com/node-stream");
    expect(result.content).toContain("Node stream content");
  });

  it("should handle Node-style streams size limit breach", async () => {
    const chunk = Buffer.alloc(2.5 * 1024 * 1024); // 2.5MB
    const mockBody = {
      [Symbol.asyncIterator]: async function* () {
        yield chunk;
      },
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "text/html"]]),
      body: mockBody,
    } as any);

    await expect(fetchWebpageWithRetry("https://example.com/node-stream-huge")).rejects.toThrow(
      /size limit exceeded/i,
    );
  });

  it("should handle response with null body", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "text/html"]]),
      body: null,
      text: async () => "<title>Null Body Page</title><body>Fallback text</body>",
    } as any);

    const result = await fetchWebpageWithRetry("https://example.com/null-body");
    expect(result.content).toContain("Fallback text");
  });

  it("should throw FETCH_PROVIDER_ERROR when fetch fails with general error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Generic Network Failure"));

    await expect(fetchWebpageWithRetry("https://example.com/fail")).rejects.toThrow(
      "Webpage fetch failed: Generic Network Failure",
    );
  });

  it("should fail when redirect response is missing Location header", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 302,
      headers: new Map([]), // No Location header
    } as any);

    await expect(fetchWebpageWithRetry("https://example.com/start")).rejects.toThrow(
      /missing Location header/i,
    );
  });

  it("should throw FETCH_PROVIDER_ERROR when fetch response is not ok (e.g. 404)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as any);

    await expect(fetchWebpageWithRetry("https://example.com/404")).rejects.toThrow(
      /HTTP fetch failed with status 404/i,
    );
  });

  it("should successfully fetch using standard Web Reader Stream happy path", async () => {
    const chunk = new TextEncoder().encode(
      "<title>Stream Success</title><body>Body Content</body>",
    );
    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunk })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };
    const mockBody = {
      getReader: () => mockReader,
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "text/html"]]),
      body: mockBody,
    } as any);

    const result = await fetchWebpageWithRetry("https://example.com/web-stream-success");
    expect(result.title).toBe("Stream Success");
    expect(result.content).toBe("Body Content");
  });
});
