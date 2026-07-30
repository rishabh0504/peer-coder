import { describe, expect, it, vi } from "vitest";
import {
  analyzeWorkspace,
  buildWorkspaceContext,
  handleError,
  summarizeWorkspace,
  validateWorkspaceInput,
} from "../../../src/agents/workspace_intelligence/nodes.js";
import type { WorkspaceGraphState } from "../../../src/agents/workspace_intelligence/state.js";
import { ollamaInstance } from "../../../src/providers/ollama/index.js";
import { workspaceFileSystem } from "../../../src/services/filesystem/filesystem.service.js";

describe("Workspace Intelligence Nodes", () => {
  it("validateWorkspaceInput successfully validates active directory", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze workspace",
      workspacePath: ".",
      status: "running",
    };

    const update = await validateWorkspaceInput(state);
    expect(update.status).toBe("running");
    expect(update.executionMetadata?.startedAt).toBeDefined();
  });

  it("validateWorkspaceInput fails on missing workspacePath", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: "",
      status: "running",
    };

    const update = await validateWorkspaceInput(state);
    expect(update.status).toBe("failed");
    expect(update.errors?.[0]?.code).toBe("INVALID_WORKSPACE");
  });

  it("validateWorkspaceInput fails on non-existent directory", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze workspace",
      workspacePath: "./non-existent-directory-abc-123",
      status: "running",
    };

    const update = await validateWorkspaceInput(state);
    expect(update.status).toBe("failed");
    expect(update.errors?.length).toBe(1);
    expect(update.errors?.[0]?.code).toBe("INVALID_WORKSPACE");
  });

  it("analyzeWorkspace successfully scans workspace", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
    };

    const update = await analyzeWorkspace(state);
    expect(update.analysisResult).toBeDefined();
    expect(update.analysisResult?.languages).toContain("typescript");
  });

  it("analyzeWorkspace handles errors gracefully", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: "./non-existent",
      status: "running",
    };

    const update = await analyzeWorkspace(state);
    expect(update.status).toBe("failed");
    expect(update.errors?.[0]?.code).toBe("ANALYSIS_FAILED");
  });

  it("buildWorkspaceContext maps raw analysis to WorkspaceContext structure", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
      analysisResult: {
        languages: ["typescript"],
        frameworks: ["nextjs"],
        packageManagers: ["pnpm"],
        testFrameworks: ["vitest"],
        runtimes: ["node"],
        structure: {
          sourceDirs: ["src"],
          testDirs: ["tests"],
          importantFiles: ["package.json"],
        },
      },
    };

    const update = await buildWorkspaceContext(state);
    expect(update.workspaceContext).toBeDefined();
    expect(update.workspaceContext?.projectName).toBeDefined();
    expect(update.workspaceContext?.languages).toContain("typescript");
    expect(update.workspaceContext?.packageManager).toBe("pnpm");
  });

  it("buildWorkspaceContext handles missing analysisResult gracefully", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
    };

    const update = await buildWorkspaceContext(state);
    expect(update.status).toBe("failed");
    expect(update.errors?.[0]?.code).toBe("BUILD_CONTEXT_FAILED");
  });

  it("summarizeWorkspace calls ollama successfully", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
      workspaceContext: {
        workspaceRoot: ".",
        sessionId: "session_123",
        permissions: { read: true, write: true, delete: true, execute: true },
        configuration: { maxFileSizeByte: 1000, binaryCheckLimitByte: 100 },
        projectName: "mock",
        languages: ["typescript"],
      },
    };

    const spy = vi.spyOn(ollamaInstance, "invoke").mockResolvedValue({
      content: "This is a mock summary.",
    } as any);

    const update = await summarizeWorkspace(state);
    expect(update.summary).toBe("This is a mock summary.");
    expect(update.status).toBe("completed");

    spy.mockRestore();
  });

  it("summarizeWorkspace handles ollama invocation errors gracefully", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
      workspaceContext: {
        workspaceRoot: ".",
        sessionId: "session_123",
        permissions: { read: true, write: true, delete: true, execute: true },
        configuration: { maxFileSizeByte: 1000, binaryCheckLimitByte: 100 },
        projectName: "mock",
        languages: ["typescript"],
      },
    };

    const spy = vi.spyOn(ollamaInstance, "invoke").mockRejectedValue(new Error("Ollama Offline"));

    const update = await summarizeWorkspace(state);
    expect(update.errors?.[0]?.code).toBe("SUMMARIZATION_FAILED");

    spy.mockRestore();
  });

  it("summarizeWorkspace returns empty object when workspaceContext is missing", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
    };

    const update = await summarizeWorkspace(state);
    expect(update).toEqual({});
  });

  it("validateWorkspaceInput fails if workspacePath is a file, not a directory", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: "package.json",
      status: "running",
    };

    const update = await validateWorkspaceInput(state);
    expect(update.status).toBe("failed");
    expect(update.errors?.[0]?.message).toContain("is not a directory");
  });

  it("buildWorkspaceContext handles invalid package.json JSON gracefully", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
      analysisResult: {
        languages: ["javascript"],
        frameworks: [],
        packageManagers: [],
        testFrameworks: [],
        runtimes: [],
        structure: {
          sourceDirs: [],
          testDirs: [],
          importantFiles: ["package.json"],
        },
      },
    };

    const spy = vi.spyOn(workspaceFileSystem, "readFile").mockResolvedValue({
      content: "{invalid-json}",
      mimeType: "text/plain",
      sizeByte: 100,
    } as any);

    const update = await buildWorkspaceContext(state);
    expect(update.workspaceContext?.projectName).toBe("peer-coder"); // Fallback to folder name
    spy.mockRestore();
  });

  it("buildWorkspaceContext parses pom.xml project name successfully", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
      analysisResult: {
        languages: ["java"],
        frameworks: [],
        packageManagers: [],
        testFrameworks: [],
        runtimes: [],
        structure: {
          sourceDirs: [],
          testDirs: [],
          importantFiles: ["pom.xml"],
        },
      },
    };

    const spy = vi.spyOn(workspaceFileSystem, "readFile").mockResolvedValue({
      content: "<project><artifactId>my-maven-app</artifactId></project>",
      mimeType: "text/plain",
      sizeByte: 100,
    } as any);

    const update = await buildWorkspaceContext(state);
    expect(update.workspaceContext?.projectName).toBe("my-maven-app");
    spy.mockRestore();
  });

  it("buildWorkspaceContext handles pom.xml read errors gracefully", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "running",
      analysisResult: {
        languages: ["java"],
        frameworks: [],
        packageManagers: [],
        testFrameworks: [],
        runtimes: [],
        structure: {
          sourceDirs: [],
          testDirs: [],
          importantFiles: ["pom.xml"],
        },
      },
    };

    const spy = vi
      .spyOn(workspaceFileSystem, "readFile")
      .mockRejectedValue(new Error("Read error"));

    const update = await buildWorkspaceContext(state);
    expect(update.workspaceContext?.projectName).toBe("peer-coder"); // Fallback to folder name
    spy.mockRestore();
  });

  it("handleError node records final failure metadata", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "failed",
      executionMetadata: {
        startedAt: new Date(Date.now() - 1000).toISOString(),
      },
    };

    const update = await handleError(state);
    expect(update.status).toBe("failed");
    expect(update.executionMetadata?.durationMs ?? 0).toBeGreaterThanOrEqual(1000);
  });

  it("handleError node handles missing startedAt metadata gracefully", async () => {
    const state: WorkspaceGraphState = {
      sessionId: "session_123",
      userRequest: "analyze",
      workspacePath: ".",
      status: "failed",
    };

    const update = await handleError(state);
    expect(update.status).toBe("failed");
    expect(update.executionMetadata?.startedAt).toBeDefined();
    expect(update.executionMetadata?.durationMs).toBeUndefined();
  });
});
