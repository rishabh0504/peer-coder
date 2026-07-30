import type { WorkspaceAnalysis } from "../../agents/workspace_intelligence/state.js";
import { workspaceFileSystem } from "../../services/filesystem/filesystem.service.js";
import type { WorkspaceContext } from "../context/workspace_context.js";
import { detectFrameworks } from "./detectors/framework_detector.js";
import { detectGit } from "./detectors/git_detector.js";
import { detectLanguages } from "./detectors/language_detector.js";
import { detectPackageManagers } from "./detectors/package_detector.js";
import { detectStructure } from "./detectors/structure_detector.js";

export class WorkspaceAnalyzer {
  public async analyze(context: WorkspaceContext): Promise<WorkspaceAnalysis> {
    // 1. Get the list of all files in the workspace (recursive, up to depth 5, max 1000 results)
    const listResult = await workspaceFileSystem.listFiles(context, {
      recursive: true,
      maxDepth: 5,
      maxResults: 1000,
    });

    const files = listResult.files;

    // 2. Execute all detectors in parallel
    const [languages, frameworks, packageManagers, structure, git] = await Promise.all([
      detectLanguages(context, files),
      detectFrameworks(context, files),
      detectPackageManagers(context, files),
      detectStructure(context, files),
      detectGit(context),
    ]);

    // Detect Runtimes based on detected languages and build files
    const runtimes: string[] = [];
    if (languages.includes("typescript") || languages.includes("javascript")) {
      runtimes.push("node");
    }
    if (languages.includes("java")) {
      runtimes.push("jvm");
    }
    if (languages.includes("python")) {
      runtimes.push("python");
    }
    if (languages.includes("go")) {
      runtimes.push("go");
    }
    if (languages.includes("rust")) {
      runtimes.push("rust");
    }

    // Detect Test Frameworks
    const testFrameworks: string[] = [];
    for (const file of files) {
      const filename = file.split("/").pop() || "";
      if (filename === "vitest.config.ts" || filename === "vitest.config.js") {
        testFrameworks.push("vitest");
      } else if (filename === "jest.config.js" || filename === "jest.config.ts") {
        testFrameworks.push("jest");
      } else if (filename === "playwright.config.ts" || filename === "playwright.config.js") {
        testFrameworks.push("playwright");
      }
    }
    if (packageManagers.includes("maven") || packageManagers.includes("gradle")) {
      testFrameworks.push("junit");
    }
    if (
      languages.includes("python") &&
      files.some((f) => f.includes("conftest.py") || f.includes("test_"))
    ) {
      testFrameworks.push("pytest");
    }

    return {
      languages,
      frameworks,
      packageManagers,
      testFrameworks,
      runtimes,
      structure,
      git,
    };
  }
}

export const workspaceAnalyzer = new WorkspaceAnalyzer();
