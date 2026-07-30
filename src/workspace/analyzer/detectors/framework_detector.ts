import { workspaceFileSystem } from "../../../services/filesystem/filesystem.service.js";
import type { WorkspaceContext } from "../../context/workspace_context.js";

export async function detectFrameworks(
  context: WorkspaceContext,
  files: string[],
): Promise<string[]> {
  const frameworks = new Set<string>();

  // Check file path signatures
  for (const file of files) {
    const filename = file.split("/").pop() || file;
    if (
      filename === "next.config.js" ||
      filename === "next.config.mjs" ||
      filename === "next.config.ts"
    ) {
      frameworks.add("nextjs");
    } else if (filename === "nuxt.config.js" || filename === "nuxt.config.ts") {
      frameworks.add("nuxtjs");
    } else if (filename === "vite.config.js" || filename === "vite.config.ts") {
      frameworks.add("vite");
    } else if (filename === "svelte.config.js") {
      frameworks.add("sveltekit");
    } else if (filename === "gatsby-config.js") {
      frameworks.add("gatsby");
    } else if (filename === "angular.json") {
      frameworks.add("angular");
    }
  }

  // Read package.json if it exists
  const packageJsonPath = files.find((f) => f.split("/").pop() === "package.json");
  if (packageJsonPath) {
    try {
      const fileData = await workspaceFileSystem.readFile(
        context,
        packageJsonPath,
        undefined,
        undefined,
        false,
      );
      const pkg = JSON.parse(fileData.content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (allDeps.next) frameworks.add("nextjs");
      if (allDeps.react) frameworks.add("react");
      if (allDeps.vue) frameworks.add("vue");
      if (allDeps["@angular/core"]) frameworks.add("angular");
      if (allDeps.nuxt) frameworks.add("nuxtjs");
      if (allDeps.express) frameworks.add("express");
      if (allDeps["@nestjs/core"]) frameworks.add("nestjs");
      if (allDeps.svelte) frameworks.add("svelte");
      if (allDeps.tailwindcss) frameworks.add("tailwind");
    } catch {
      // Ignore reading/parsing issues
    }
  }

  // Read Java build files
  const pomPath = files.find((f) => f.split("/").pop() === "pom.xml");
  if (pomPath) {
    try {
      const fileData = await workspaceFileSystem.readFile(
        context,
        pomPath,
        undefined,
        undefined,
        false,
      );
      const content = fileData.content;
      if (content.includes("spring-boot-starter")) frameworks.add("springboot");
      if (content.includes("quarkus")) frameworks.add("quarkus");
      if (content.includes("micronaut")) frameworks.add("micronaut");
    } catch {
      // Ignore
    }
  }

  const gradlePath = files.find((f) => {
    const fn = f.split("/").pop();
    return fn === "build.gradle" || fn === "build.gradle.kts";
  });
  if (gradlePath) {
    try {
      const fileData = await workspaceFileSystem.readFile(
        context,
        gradlePath,
        undefined,
        undefined,
        false,
      );
      const content = fileData.content;
      if (content.includes("org.springframework.boot") || content.includes("spring-boot")) {
        frameworks.add("springboot");
      }
      if (content.includes("io.quarkus") || content.includes("quarkus")) {
        frameworks.add("quarkus");
      }
      if (content.includes("micronaut")) {
        frameworks.add("micronaut");
      }
    } catch {
      // Ignore
    }
  }

  // Read Python dependency specifications
  const pyprojectPath = files.find((f) => f.split("/").pop() === "pyproject.toml");
  if (pyprojectPath) {
    try {
      const fileData = await workspaceFileSystem.readFile(
        context,
        pyprojectPath,
        undefined,
        undefined,
        false,
      );
      const content = fileData.content.toLowerCase();
      if (content.includes("django")) frameworks.add("django");
      if (content.includes("flask")) frameworks.add("flask");
      if (content.includes("fastapi")) frameworks.add("fastapi");
    } catch {
      // Ignore
    }
  }

  const reqsPath = files.find((f) => f.split("/").pop() === "requirements.txt");
  if (reqsPath) {
    try {
      const fileData = await workspaceFileSystem.readFile(
        context,
        reqsPath,
        undefined,
        undefined,
        false,
      );
      const content = fileData.content.toLowerCase();
      if (content.includes("django")) frameworks.add("django");
      if (content.includes("flask")) frameworks.add("flask");
      if (content.includes("fastapi")) frameworks.add("fastapi");
    } catch {
      // Ignore
    }
  }

  // Rust frameworks (Cargo.toml)
  const cargoPath = files.find((f) => f.split("/").pop() === "Cargo.toml");
  if (cargoPath) {
    try {
      const fileData = await workspaceFileSystem.readFile(
        context,
        cargoPath,
        undefined,
        undefined,
        false,
      );
      const content = fileData.content.toLowerCase();
      if (content.includes("actix-web")) frameworks.add("actixweb");
      if (content.includes("axum")) frameworks.add("axum");
      if (content.includes("rocket")) frameworks.add("rocket");
      if (content.includes("tokio")) frameworks.add("tokio");
    } catch {
      // Ignore
    }
  }

  return Array.from(frameworks);
}
