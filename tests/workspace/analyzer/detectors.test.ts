import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { workspaceFileSystem } from "../../../src/services/filesystem/filesystem.service.js";
import { detectFrameworks } from "../../../src/workspace/analyzer/detectors/framework_detector.js";
import { detectGit } from "../../../src/workspace/analyzer/detectors/git_detector.js";
import { detectLanguages } from "../../../src/workspace/analyzer/detectors/language_detector.js";
import { detectPackageManagers } from "../../../src/workspace/analyzer/detectors/package_detector.js";
import { detectStructure } from "../../../src/workspace/analyzer/detectors/structure_detector.js";
import { createDefaultWorkspaceContext } from "../../../src/workspace/context/workspace_context.js";

describe("Workspace Detectors", () => {
  const context = createDefaultWorkspaceContext();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects languages correctly", async () => {
    const files = [
      "src/index.ts",
      "src/pages/index.tsx",
      "main.py",
      "src/main/java/com/example/App.java",
      "Cargo.toml",
      "main.c",
      "main.cpp",
      "go.mod",
    ];

    const langs = await detectLanguages(context, files);
    expect(langs).toContain("typescript");
    expect(langs).toContain("python");
    expect(langs).toContain("java");
    expect(langs).toContain("rust");
    expect(langs).toContain("c");
    expect(langs).toContain("cpp");
    expect(langs).toContain("go");
  });

  it("detects package managers correctly", async () => {
    const files = [
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      "bun.lockb",
      "pom.xml",
      "build.gradle",
      "poetry.lock",
      "Pipfile",
      "environment.yml",
      "requirements.txt",
      "Cargo.toml",
      "go.mod",
    ];

    const packageManagers = await detectPackageManagers(context, files);
    expect(packageManagers).toContain("pnpm");
    expect(packageManagers).toContain("npm");
    expect(packageManagers).toContain("yarn");
    expect(packageManagers).toContain("bun");
    expect(packageManagers).toContain("maven");
    expect(packageManagers).toContain("gradle");
    expect(packageManagers).toContain("poetry");
    expect(packageManagers).toContain("pipenv");
    expect(packageManagers).toContain("conda");
    expect(packageManagers).toContain("pip");
    expect(packageManagers).toContain("cargo");
    expect(packageManagers).toContain("go modules");
  });

  it("package manager fallback when package.json is present but no lockfile exists", async () => {
    const files = ["package.json"];
    const packageManagers = await detectPackageManagers(context, files);
    expect(packageManagers).toContain("npm");
  });

  it("detects frameworks from configuration files and mock contents", async () => {
    const files = [
      "next.config.js",
      "nuxt.config.js",
      "vite.config.js",
      "svelte.config.js",
      "gatsby-config.js",
      "angular.json",
      "package.json",
      "requirements.txt",
      "Cargo.toml",
    ];

    // Mock file system reads
    const readSpy = vi.spyOn(workspaceFileSystem, "readFile").mockImplementation((async (
      _ctx: any,
      filePath: string,
    ) => {
      if (filePath.endsWith("package.json")) {
        return {
          content: JSON.stringify({ dependencies: { react: "18.0.0", vue: "3.0.0" } }),
          mimeType: "text/plain",
          sizeByte: 100,
        } as any;
      }
      if (filePath.endsWith("requirements.txt")) {
        return {
          content: "django==4.0\nflask\nfastapi",
          mimeType: "text/plain",
          sizeByte: 100,
        } as any;
      }
      if (filePath.endsWith("Cargo.toml")) {
        return {
          content: 'actix-web = "4"\naxum = "0.6"\nrocket = "0.5"\ntokio = "1"',
          mimeType: "text/plain",
          sizeByte: 100,
        } as any;
      }
      throw new Error("not found");
    }) as any);

    const frameworks = await detectFrameworks(context, files);
    expect(frameworks).toContain("nextjs");
    expect(frameworks).toContain("nuxtjs");
    expect(frameworks).toContain("vite");
    expect(frameworks).toContain("sveltekit");
    expect(frameworks).toContain("gatsby");
    expect(frameworks).toContain("angular");
    expect(frameworks).toContain("react");
    expect(frameworks).toContain("vue");
    expect(frameworks).toContain("django");
    expect(frameworks).toContain("flask");
    expect(frameworks).toContain("fastapi");
    expect(frameworks).toContain("actixweb");
    expect(frameworks).toContain("axum");
    expect(frameworks).toContain("rocket");
    expect(frameworks).toContain("tokio");

    readSpy.mockRestore();
  });

  it("detectFrameworks reads and parses pom.xml, build.gradle, and pyproject.toml correctly", async () => {
    const files = ["pom.xml", "build.gradle", "pyproject.toml"];
    const readSpy = vi.spyOn(workspaceFileSystem, "readFile").mockImplementation((async (
      _ctx: any,
      filePath: string,
    ) => {
      if (filePath.endsWith("pom.xml")) {
        return {
          content: "spring-boot-starter quarkus micronaut",
          mimeType: "text/plain",
          sizeByte: 100,
        } as any;
      }
      if (filePath.endsWith("build.gradle")) {
        return {
          content: "org.springframework.boot quarkus micronaut",
          mimeType: "text/plain",
          sizeByte: 100,
        } as any;
      }
      if (filePath.endsWith("pyproject.toml")) {
        return { content: "django flask fastapi", mimeType: "text/plain", sizeByte: 100 } as any;
      }
      throw new Error("not found");
    }) as any);

    const frameworks = await detectFrameworks(context, files);
    expect(frameworks).toContain("springboot");
    expect(frameworks).toContain("quarkus");
    expect(frameworks).toContain("micronaut");
    expect(frameworks).toContain("django");
    expect(frameworks).toContain("flask");
    expect(frameworks).toContain("fastapi");

    readSpy.mockRestore();
  });

  it("detectFrameworks handles pom.xml, build.gradle, and pyproject.toml read errors gracefully", async () => {
    const files = ["pom.xml", "build.gradle", "pyproject.toml"];
    const readSpy = vi
      .spyOn(workspaceFileSystem, "readFile")
      .mockRejectedValue(new Error("read error"));

    const frameworks = await detectFrameworks(context, files);
    expect(frameworks).toEqual([]);

    readSpy.mockRestore();
  });

  it("detectFrameworks handles package.json read/parse errors gracefully", async () => {
    const files = ["package.json"];
    const readSpy = vi.spyOn(workspaceFileSystem, "readFile").mockResolvedValue({
      content: "{invalid-json}",
      mimeType: "text/plain",
      sizeByte: 100,
    } as any);

    const frameworks = await detectFrameworks(context, files);
    expect(frameworks).toEqual([]);

    readSpy.mockRestore();
  });

  it("detectFrameworks handles requirements.txt read errors gracefully", async () => {
    const files = ["requirements.txt"];
    const readSpy = vi
      .spyOn(workspaceFileSystem, "readFile")
      .mockRejectedValue(new Error("read error"));

    const frameworks = await detectFrameworks(context, files);
    expect(frameworks).toEqual([]);

    readSpy.mockRestore();
  });

  it("detectFrameworks handles Cargo.toml read errors gracefully", async () => {
    const files = ["Cargo.toml"];
    const readSpy = vi
      .spyOn(workspaceFileSystem, "readFile")
      .mockRejectedValue(new Error("read error"));

    const frameworks = await detectFrameworks(context, files);
    expect(frameworks).toEqual([]);

    readSpy.mockRestore();
  });

  it("detectFrameworks handles file read errors gracefully", async () => {
    const files = ["package.json", "requirements.txt", "Cargo.toml"];
    const readSpy = vi
      .spyOn(workspaceFileSystem, "readFile")
      .mockRejectedValue(new Error("read error"));

    const frameworks = await detectFrameworks(context, files);
    expect(frameworks).toEqual([]);

    readSpy.mockRestore();
  });

  it("detects package managers with empty filename edge cases", async () => {
    const files = ["", "package.json"];
    const packageManagers = await detectPackageManagers(context, files);
    expect(packageManagers).toContain("npm");
  });

  it("detects project structure and paths", async () => {
    const files = [
      "src/main/java/com/example/App.java",
      "src/test/java/com/example/AppTest.java",
      "src/main/resources/config.properties",
      "lib/utils.spec.ts",
      "app/layout.tsx",
      "pages/home.tsx",
      "test/unit/cli.test.ts",
      "package.json",
    ];

    const structure = await detectStructure(context, files);
    expect(structure.sourceDirs).toContain("src/main/java");
    expect(structure.sourceDirs).toContain("src/main/resources");
    expect(structure.sourceDirs).toContain("app");
    expect(structure.sourceDirs).toContain("pages");
    expect(structure.testDirs).toContain("src/test/java");
    expect(structure.testDirs).toContain("lib"); // due to lib/utils.spec.ts
    expect(structure.testDirs).toContain("test/unit");
    expect(structure.importantFiles).toContain("package.json");
  });

  it("checks git repository presence - positive path", async () => {
    const gitInfo = await detectGit(context);
    expect(gitInfo?.isRepo).toBe(true);
    expect(gitInfo?.branch).toBeDefined();
  });

  it("detectGit returns isRepo false if .git is not a directory", async () => {
    const statSpy = vi.spyOn(fs, "stat").mockResolvedValue({
      isDirectory: () => false,
    } as any);

    const gitInfo = await detectGit(context);
    expect(gitInfo?.isRepo).toBe(false);

    statSpy.mockRestore();
  });

  it("detectGit handles fs.stat errors gracefully", async () => {
    const statSpy = vi.spyOn(fs, "stat").mockRejectedValue(new Error("stat error"));

    const gitInfo = await detectGit(context);
    expect(gitInfo?.isRepo).toBe(false);

    statSpy.mockRestore();
  });

  it("detectGit parses detached HEAD commit hash correctly", async () => {
    const statSpy = vi.spyOn(fs, "stat").mockResolvedValue({
      isDirectory: () => true,
    } as any);

    const readSpy = vi.spyOn(fs, "readFile").mockResolvedValue("abc123detachedcommit\n");

    const gitInfo = await detectGit(context);
    expect(gitInfo?.isRepo).toBe(true);
    expect(gitInfo?.headCommit).toBe("abc123detachedcommit");

    statSpy.mockRestore();
    readSpy.mockRestore();
  });

  it("detectGit handles HEAD file read errors gracefully", async () => {
    const statSpy = vi.spyOn(fs, "stat").mockResolvedValue({
      isDirectory: () => true,
    } as any);

    const readSpy = vi.spyOn(fs, "readFile").mockRejectedValue(new Error("read error"));

    const gitInfo = await detectGit(context);
    expect(gitInfo?.isRepo).toBe(true);
    expect(gitInfo?.branch).toBe("unknown");

    statSpy.mockRestore();
    readSpy.mockRestore();
  });

  it("detectGit handles branch head read failures gracefully", async () => {
    const statSpy = vi.spyOn(fs, "stat").mockResolvedValue({
      isDirectory: () => true,
    } as any);

    const readSpy = vi.spyOn(fs, "readFile").mockImplementation(async (filePath: any) => {
      if (filePath.endsWith("HEAD")) {
        return "ref: refs/heads/feature/branch-name\n";
      }
      throw new Error("read error on ref head");
    });

    const gitInfo = await detectGit(context);
    expect(gitInfo?.isRepo).toBe(true);
    expect(gitInfo?.branch).toBe("feature/branch-name");
    expect(gitInfo?.headCommit).toBeUndefined();

    statSpy.mockRestore();
    readSpy.mockRestore();
  });
});
