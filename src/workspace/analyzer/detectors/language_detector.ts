import type { WorkspaceContext } from "../../context/workspace_context.js";

export async function detectLanguages(
  _context: WorkspaceContext,
  files: string[],
): Promise<string[]> {
  const languages = new Set<string>();

  for (const file of files) {
    const lowerFile = file.toLowerCase();
    if (lowerFile.endsWith(".ts") || lowerFile.endsWith(".tsx")) {
      languages.add("typescript");
    } else if (
      lowerFile.endsWith(".js") ||
      lowerFile.endsWith(".jsx") ||
      lowerFile.endsWith(".mjs") ||
      lowerFile.endsWith(".cjs")
    ) {
      languages.add("javascript");
    } else if (lowerFile.endsWith(".java") || lowerFile.endsWith(".jar")) {
      languages.add("java");
    } else if (lowerFile.endsWith(".py")) {
      languages.add("python");
    } else if (lowerFile.endsWith(".rs")) {
      languages.add("rust");
    } else if (lowerFile.endsWith(".go")) {
      languages.add("go");
    } else if (lowerFile.endsWith(".c") || lowerFile.endsWith(".h")) {
      languages.add("c");
    } else if (
      lowerFile.endsWith(".cpp") ||
      lowerFile.endsWith(".hpp") ||
      lowerFile.endsWith(".cc") ||
      lowerFile.endsWith(".cxx")
    ) {
      languages.add("cpp");
    }
  }

  // Also check config files as fallback/confirmation
  if (files.some((f) => f.endsWith("tsconfig.json"))) {
    languages.add("typescript");
  }
  if (
    files.some(
      (f) => f.endsWith("pom.xml") || f.endsWith("build.gradle") || f.endsWith("build.gradle.kts"),
    )
  ) {
    languages.add("java");
  }
  if (
    files.some(
      (f) =>
        f.endsWith("pyproject.toml") || f.endsWith("requirements.txt") || f.endsWith("setup.py"),
    )
  ) {
    languages.add("python");
  }
  if (files.some((f) => f.endsWith("Cargo.toml"))) {
    languages.add("rust");
  }
  if (files.some((f) => f.endsWith("go.mod"))) {
    languages.add("go");
  }

  return Array.from(languages);
}
