import type { WorkspaceContext } from "../../context/workspace_context.js";

export async function detectPackageManagers(
  _context: WorkspaceContext,
  files: string[],
): Promise<string[]> {
  const managers = new Set<string>();

  for (const file of files) {
    const filename = file.split("/").pop() || file;

    // JS/TS Package Managers
    if (filename === "pnpm-lock.yaml") {
      managers.add("pnpm");
    } else if (filename === "package-lock.json") {
      managers.add("npm");
    } else if (filename === "yarn.lock") {
      managers.add("yarn");
    } else if (filename === "bun.lockb") {
      managers.add("bun");
    }

    // Java Package/Build Managers
    else if (filename === "pom.xml" || filename === "mvnw") {
      managers.add("maven");
    } else if (
      filename === "build.gradle" ||
      filename === "build.gradle.kts" ||
      filename === "gradlew"
    ) {
      managers.add("gradle");
    }

    // Python Managers
    else if (filename === "poetry.lock" || filename === "poetry.toml") {
      managers.add("poetry");
    } else if (filename === "Pipfile" || filename === "Pipfile.lock") {
      managers.add("pipenv");
    } else if (filename === "environment.yml") {
      managers.add("conda");
    } else if (filename === "requirements.txt") {
      managers.add("pip");
    }

    // Rust
    else if (filename === "Cargo.toml") {
      managers.add("cargo");
    }

    // Go
    else if (filename === "go.mod") {
      managers.add("go modules");
    }
  }

  // Fallback JS package manager checks
  if (files.some((f) => f.endsWith("package.json")) && managers.size === 0) {
    managers.add("npm");
  }

  return Array.from(managers);
}
