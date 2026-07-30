import { afterEach, describe, expect, it, vi } from "vitest";
import { workspaceFileSystem } from "../../../src/services/filesystem/filesystem.service.js";
import { workspaceAnalyzer } from "../../../src/workspace/analyzer/analyzer.js";

describe("WorkspaceAnalyzer Service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successfully detects Node runtime and Jest/Playwright/Vitest test frameworks", async () => {
    const mockContext = {
      workspaceRoot: ".",
      sessionId: "session_123",
      permissions: { read: true, write: true, delete: true, execute: true },
      configuration: { maxFileSizeByte: 1000, binaryCheckLimitByte: 100 },
    };

    const listFilesSpy = vi.spyOn(workspaceFileSystem, "listFiles").mockResolvedValue({
      files: [
        "package.json",
        "vitest.config.ts",
        "jest.config.js",
        "playwright.config.ts",
        "src/index.ts",
        "",
      ],
    } as any);

    const result = await workspaceAnalyzer.analyze(mockContext);
    expect(result.runtimes).toContain("node");
    expect(result.testFrameworks).toContain("vitest");
    expect(result.testFrameworks).toContain("jest");
    expect(result.testFrameworks).toContain("playwright");

    listFilesSpy.mockRestore();
  });

  it("successfully detects Java/Python runtimes and JUnit/Pytest test frameworks", async () => {
    const mockContext = {
      workspaceRoot: ".",
      sessionId: "session_123",
      permissions: { read: true, write: true, delete: true, execute: true },
      configuration: { maxFileSizeByte: 1000, binaryCheckLimitByte: 100 },
    };

    const listFilesSpy = vi.spyOn(workspaceFileSystem, "listFiles").mockResolvedValue({
      files: ["pom.xml", "conftest.py", "test_cli.py", "src/main/java/App.java", "main.py"],
    } as any);

    const result = await workspaceAnalyzer.analyze(mockContext);
    expect(result.runtimes).toContain("jvm");
    expect(result.runtimes).toContain("python");
    expect(result.testFrameworks).toContain("junit");
    expect(result.testFrameworks).toContain("pytest");

    listFilesSpy.mockRestore();
  });

  it("successfully detects Go/Rust runtimes", async () => {
    const mockContext = {
      workspaceRoot: ".",
      sessionId: "session_123",
      permissions: { read: true, write: true, delete: true, execute: true },
      configuration: { maxFileSizeByte: 1000, binaryCheckLimitByte: 100 },
    };

    const listFilesSpy = vi.spyOn(workspaceFileSystem, "listFiles").mockResolvedValue({
      files: ["go.mod", "Cargo.toml", "main.go", "src/main.rs"],
    } as any);

    const result = await workspaceAnalyzer.analyze(mockContext);
    expect(result.runtimes).toContain("go");
    expect(result.runtimes).toContain("rust");

    listFilesSpy.mockRestore();
  });
});
