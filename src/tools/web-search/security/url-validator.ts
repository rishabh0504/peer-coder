import { WebToolError } from "../errors/web.errors.js";

export function normalizeUrl(urlStr: string): string {
  const url = new URL(urlStr);
  let cleanPath = url.pathname;
  if (cleanPath === "/") {
    cleanPath = "";
  } else if (cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }
  const keysToDelete: string[] = [];
  url.searchParams.forEach((_, key) => {
    if (key.startsWith("utm_")) {
      keysToDelete.push(key);
    }
  });
  for (const key of keysToDelete) {
    url.searchParams.delete(key);
  }
  const searchPart = url.search ? url.search : "";
  return `${url.protocol}//${url.host}${cleanPath}${searchPart}`;
}

export function validateUrl(urlStr: string): string {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new WebToolError("FETCH_BLOCKED_URL", `Invalid URL: ${urlStr}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new WebToolError(
      "FETCH_BLOCKED_URL",
      `Blocked URL scheme: ${url.protocol}. Only http: and https: are allowed.`,
    );
  }

  const host = url.hostname.toLowerCase();
  if (!host) {
    throw new WebToolError("FETCH_BLOCKED_URL", "Blocked URL: Hostname is empty.");
  }

  if (host === "localhost" || host === "loopback") {
    throw new WebToolError("FETCH_BLOCKED_URL", `Blocked host: ${host}`);
  }

  // IPv4 Checks
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = host.match(ipv4Regex);
  if (ipv4Match) {
    const parts = ipv4Match.slice(1).map(Number);
    if (parts.some((p) => p < 0 || p > 255)) {
      throw new WebToolError("FETCH_BLOCKED_URL", `Invalid IPv4 address: ${host}`);
    }
    const [p0, p1 = 0] = parts;
    if (p0 === 127) {
      throw new WebToolError("FETCH_BLOCKED_URL", "Blocked loopback IP address.");
    }
    if (p0 === 10) {
      throw new WebToolError("FETCH_BLOCKED_URL", "Blocked private IP address.");
    }
    if (p0 === 172 && p1 >= 16 && p1 <= 31) {
      throw new WebToolError("FETCH_BLOCKED_URL", "Blocked private IP address.");
    }
    if (p0 === 192 && p1 === 168) {
      throw new WebToolError("FETCH_BLOCKED_URL", "Blocked private IP address.");
    }
    if (parts.every((p) => p === 0)) {
      throw new WebToolError("FETCH_BLOCKED_URL", "Blocked private IP address.");
    }
  }

  // IPv6 Checks
  if (host === "::1" || host === "[::1]") {
    throw new WebToolError("FETCH_BLOCKED_URL", "Blocked loopback IPv6 address.");
  }
  const cleanHost = host.replace(/[\[\]]/g, "");
  if (
    cleanHost.startsWith("fe80:") ||
    cleanHost.startsWith("fc00:") ||
    cleanHost.startsWith("fd00:")
  ) {
    throw new WebToolError("FETCH_BLOCKED_URL", "Blocked private/local IPv6 address.");
  }

  return urlStr;
}
