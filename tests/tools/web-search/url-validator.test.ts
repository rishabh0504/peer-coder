import { describe, expect, it, vi } from "vitest";
import { normalizeUrl, validateUrl } from "../../../src/tools/web-search/security/url-validator.js";

describe("URL Validator & Normalizer", () => {
  it("should normalize URLs correctly", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
    expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
    expect(normalizeUrl("https://example.com/path?utm_source=google&q=search")).toBe(
      "https://example.com/path?q=search",
    );
  });

  it("should validate safe URLs", () => {
    expect(validateUrl("https://example.com/path")).toBe("https://example.com/path");
    expect(validateUrl("http://example.org")).toBe("http://example.org");
  });

  it("should block loopback, localhost and private IPs", () => {
    expect(() => validateUrl("http://localhost:8080")).toThrow(/Blocked host/);
    expect(() => validateUrl("http://127.0.0.1/abc")).toThrow(/Blocked loopback/);
    expect(() => validateUrl("https://10.0.0.1")).toThrow(/Blocked private/);
    expect(() => validateUrl("http://172.16.10.5")).toThrow(/Blocked private/);
    expect(() => validateUrl("http://192.168.1.1")).toThrow(/Blocked private/);
    expect(() => validateUrl("http://0.0.0.0")).toThrow(/Blocked private/);
    expect(() => validateUrl("http://[::1]")).toThrow(/Blocked loopback/);
    expect(() => validateUrl("http://[fe80::1]")).toThrow(/Blocked private/);
    expect(() => validateUrl("http://[fc00::1]")).toThrow(/Blocked private/);
    expect(() => validateUrl("http://[fd00::1]")).toThrow(/Blocked private/);
    expect(() => validateUrl("http://999.0.0.1")).toThrow(/Invalid/);
  });

  it("should block invalid URLs and other schemes", () => {
    expect(() => validateUrl("ftp://example.com")).toThrow(/Blocked URL scheme/);
    expect(() => validateUrl("javascript:alert(1)")).toThrow(/Blocked URL scheme/);
    expect(() => validateUrl("not_a_url")).toThrow(/Invalid URL/);
    expect(() => validateUrl("http://999.0.0.1")).toThrow(/Invalid URL/);
  });

  it("should cover defensive empty host check via getter stubbing", () => {
    const hostnameSpy = vi.spyOn(URL.prototype, "hostname", "get").mockReturnValue("");
    expect(() => validateUrl("http://example.com")).toThrow("Blocked URL: Hostname is empty.");
    hostnameSpy.mockRestore();
  });

  it("should cover defensive invalid IPv4 octet check via getter stubbing", () => {
    const hostnameSpy = vi.spyOn(URL.prototype, "hostname", "get").mockReturnValue("999.0.0.1");
    expect(() => validateUrl("http://example.com")).toThrow("Invalid IPv4 address: 999.0.0.1");
    hostnameSpy.mockRestore();
  });
});
