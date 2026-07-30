import fs from "node:fs/promises";
import path from "node:path";
import { ollamaInstance } from "../../providers/ollama/index.js";
import { workspaceFileSystem } from "../../services/filesystem/filesystem.service.js";
import { workspaceAnalyzer } from "../../workspace/analyzer/analyzer.js";
import { createDefaultWorkspaceContext } from "../../workspace/context/workspace_context.js";
import type { WorkspaceContext } from "../../workspace/context/workspace_context.js";
import { validatePath } from "../../workspace/context/workspace_guard.js";
import type { AgentError, WorkspaceGraphState } from "./state.js";

export async function validateWorkspaceInput(
  state: WorkspaceGraphState,
): Promise<Partial<WorkspaceGraphState>> {
  const startedAt = new Date().toISOString();
  try {
    if (!state.workspacePath) {
      throw new Error("workspacePath is required.");
    }
    const resolvedPath = path.resolve(state.workspacePath);
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path '${state.workspacePath}' is not a directory.`);
    }

    const mockContext = createDefaultWorkspaceContext(resolvedPath, state.sessionId);
    validatePath(mockContext, resolvedPath);

    return {
      status: "running",
      executionMetadata: {
        startedAt,
      },
    };
  } catch (err: any) {
    const errorDetail: AgentError = {
      code: "INVALID_WORKSPACE",
      message: err.message || String(err),
      node: "workspace.validate_input",
      timestamp: new Date().toISOString(),
      retryable: false,
    };
    return {
      status: "failed",
      errors: [...(state.errors || []), errorDetail],
      executionMetadata: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: 0,
      },
    };
  }
}

export async function analyzeWorkspace(
  state: WorkspaceGraphState,
): Promise<Partial<WorkspaceGraphState>> {
  try {
    const context =
      state.workspaceContext || createDefaultWorkspaceContext(state.workspacePath, state.sessionId);
    const analysisResult = await workspaceAnalyzer.analyze(context);
    return {
      analysisResult,
    };
  } catch (err: any) {
    const errorDetail: AgentError = {
      code: "ANALYSIS_FAILED",
      message: err.message || String(err),
      node: "workspace.analyze",
      timestamp: new Date().toISOString(),
      retryable: true,
    };
    return {
      status: "failed",
      errors: [...(state.errors || []), errorDetail],
    };
  }
}

export async function buildWorkspaceContext(
  state: WorkspaceGraphState,
): Promise<Partial<WorkspaceGraphState>> {
  try {
    if (!state.analysisResult) {
      throw new Error("No analysis result found.");
    }
    const analysis = state.analysisResult;
    const baseContext =
      state.workspaceContext || createDefaultWorkspaceContext(state.workspacePath, state.sessionId);

    let projectName = path.basename(path.resolve(state.workspacePath));
    const packageJsonPath = analysis.structure.importantFiles.find((f) =>
      f.endsWith("package.json"),
    );
    const pomPath = analysis.structure.importantFiles.find((f) => f.endsWith("pom.xml"));

    if (packageJsonPath) {
      try {
        const fileData = await workspaceFileSystem.readFile(
          baseContext,
          packageJsonPath,
          undefined,
          undefined,
          false,
        );
        const pkg = JSON.parse(fileData.content);
        if (pkg.name) {
          projectName = pkg.name;
        }
      } catch {
        // ignore
      }
    } else if (pomPath) {
      try {
        const fileData = await workspaceFileSystem.readFile(
          baseContext,
          pomPath,
          undefined,
          undefined,
          false,
        );
        const match = fileData.content.match(/<artifactId>([^<]+)<\/artifactId>/);
        if (match?.[1]) {
          projectName = match[1].trim();
        }
      } catch {
        // ignore
      }
    }

    const updatedContext: WorkspaceContext = {
      ...baseContext,
      projectName,
      languages: analysis.languages,
      frameworks: analysis.frameworks,
      runtimes: analysis.runtimes,
      packageManager: analysis.packageManagers[0] || undefined,
      testFrameworks: analysis.testFrameworks,
      importantFiles: analysis.structure.importantFiles,
    };

    return {
      workspaceContext: updatedContext,
      status: "completed",
    };
  } catch (err: any) {
    const errorDetail: AgentError = {
      code: "BUILD_CONTEXT_FAILED",
      message: err.message || String(err),
      node: "workspace.build_context",
      timestamp: new Date().toISOString(),
      retryable: false,
    };
    return {
      status: "failed",
      errors: [...(state.errors || []), errorDetail],
    };
  }
}

export async function summarizeWorkspace(
  state: WorkspaceGraphState,
): Promise<Partial<WorkspaceGraphState>> {
  if (!state.workspaceContext) {
    return {};
  }
  try {
    const prompt = `You are a technical system analyzer. Based on the following workspace context facts, generate a concise, human-readable summary of the project architecture, tech stack, and conventions.
Do not hallucinate files or information not present in the facts.

Project Name: ${state.workspaceContext.projectName}
Languages: ${state.workspaceContext.languages?.join(", ") || "None"}
Frameworks: ${state.workspaceContext.frameworks?.join(", ") || "None"}
Runtimes: ${state.workspaceContext.runtimes?.join(", ") || "None"}
Package Manager: ${state.workspaceContext.packageManager || "None"}
Test Frameworks: ${state.workspaceContext.testFrameworks?.join(", ") || "None"}
Important Files: ${state.workspaceContext.importantFiles?.join(", ") || "None"}
`;

    const res = await ollamaInstance.invoke(prompt);
    const summary = typeof res.content === "string" ? res.content : JSON.stringify(res.content);

    return {
      summary,
      status: "completed",
    };
  } catch (err: any) {
    const errorDetail: AgentError = {
      code: "SUMMARIZATION_FAILED",
      message: err.message || String(err),
      node: "workspace.summarize",
      timestamp: new Date().toISOString(),
      retryable: true,
    };
    // Summarization failure shouldn't crash the entire flow; log and proceed
    return {
      errors: [...(state.errors || []), errorDetail],
    };
  }
}

export async function handleError(
  state: WorkspaceGraphState,
): Promise<Partial<WorkspaceGraphState>> {
  const completedAt = new Date().toISOString();
  const startedAt = state.executionMetadata?.startedAt;
  const durationMs = startedAt
    ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
    : undefined;

  return {
    status: "failed",
    executionMetadata: {
      startedAt: startedAt || completedAt,
      completedAt,
      durationMs,
    },
  };
}
