import type { WorkspaceContext } from "../../context/workspace_context.js";

export async function detectStructure(
  _context: WorkspaceContext,
  files: string[],
): Promise<{ sourceDirs: string[]; testDirs: string[]; importantFiles: string[] }> {
  const sourceDirs = new Set<string>();
  const testDirs = new Set<string>();
  const importantFiles = new Set<string>();

  for (const file of files) {
    const parts = file.split("/");
    const filename = parts.pop() || "";
    const parentDir = parts.join("/");

    // 1. Identify important files
    const lowerFilename = filename.toLowerCase();
    if (
      lowerFilename === "package.json" ||
      lowerFilename === "pom.xml" ||
      lowerFilename === "build.gradle" ||
      lowerFilename === "build.gradle.kts" ||
      lowerFilename === "tsconfig.json" ||
      lowerFilename === "cargo.toml" ||
      lowerFilename === "go.mod" ||
      lowerFilename === "pyproject.toml" ||
      lowerFilename === "requirements.txt" ||
      lowerFilename === "dockerfile" ||
      lowerFilename === "docker-compose.yml" ||
      lowerFilename === ".gitignore" ||
      lowerFilename === "readme.md"
    ) {
      importantFiles.add(file);
    }

    // 2. Identify source/test structures
    if (file.startsWith("src/main/java/")) {
      sourceDirs.add("src/main/java");
    } else if (file.startsWith("src/test/java/")) {
      testDirs.add("src/test/java");
    } else if (file.startsWith("src/main/resources/")) {
      sourceDirs.add("src/main/resources");
    } else if (file.startsWith("src/") || file.startsWith("lib/")) {
      if (file.includes("test") || file.includes("spec")) {
        testDirs.add(parentDir);
      } else {
        sourceDirs.add(parentDir);
      }
    } else if (file.startsWith("app/") || file.startsWith("pages/")) {
      sourceDirs.add(parentDir);
    } else if (file.startsWith("test/") || file.startsWith("tests/")) {
      testDirs.add(parentDir);
    }
  }

  // Filter paths to find root-most directories
  const cleanSourceDirs = filterSubdirectories(Array.from(sourceDirs));
  const cleanTestDirs = filterSubdirectories(Array.from(testDirs));

  return {
    sourceDirs: cleanSourceDirs,
    testDirs: cleanTestDirs,
    importantFiles: Array.from(importantFiles),
  };
}

// Keep only top-level directories to prevent nested directory explosion
function filterSubdirectories(dirs: string[]): string[] {
  const sorted = dirs.sort((a, b) => a.length - b.length);
  const result: string[] = [];

  for (const dir of sorted) {
    if (!result.some((existing) => dir.startsWith(`${existing}/`))) {
      result.push(dir);
    }
  }

  return result;
}
