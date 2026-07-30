import path from "node:path";
import { describe, expect, it } from "vitest";
import { workspaceIntelligenceGraph } from "../../../src/agents/workspace_intelligence/graph.js";

describe("Workspace Intelligence Integration tests with fixtures", () => {
  it("analyzes mock Next.js project", async () => {
    const fixturePath = path.resolve("tests/fixtures/workspace/nextjs-project");
    const result = await workspaceIntelligenceGraph.invoke({
      sessionId: "session_next",
      userRequest: "analyze mock next",
      workspacePath: fixturePath,
      includeSummary: false,
    });

    expect(result.status).toBe("completed");
    expect(result.workspaceContext).toBeDefined();
    expect(result.workspaceContext.projectName).toBe("mock-nextjs");
    expect(result.workspaceContext.languages).toContain("typescript");
    expect(result.workspaceContext.frameworks).toContain("nextjs");
    expect(result.workspaceContext.packageManager).toBe("npm");
  });

  it("analyzes mock Python project", async () => {
    const fixturePath = path.resolve("tests/fixtures/workspace/python-project");
    const result = await workspaceIntelligenceGraph.invoke({
      sessionId: "session_py",
      userRequest: "analyze mock python",
      workspacePath: fixturePath,
      includeSummary: false,
    });

    expect(result.status).toBe("completed");
    expect(result.workspaceContext.languages).toContain("python");
    expect(result.workspaceContext.frameworks).toContain("fastapi");
    expect(result.workspaceContext.packageManager).toBe("pip");
  });

  it("analyzes mock Java Maven project", async () => {
    const fixturePath = path.resolve("tests/fixtures/workspace/java-maven-project");
    const result = await workspaceIntelligenceGraph.invoke({
      sessionId: "session_maven",
      userRequest: "analyze mock maven",
      workspacePath: fixturePath,
      includeSummary: false,
    });

    expect(result.status).toBe("completed");
    expect(result.workspaceContext.projectName).toBe("mock-maven");
    expect(result.workspaceContext.languages).toContain("java");
    expect(result.workspaceContext.frameworks).toContain("springboot");
    expect(result.workspaceContext.packageManager).toBe("maven");
    expect(result.workspaceContext.testFrameworks).toContain("junit");
    expect(result.workspaceContext.importantFiles).toContain("pom.xml");
  });

  it("analyzes mock Java Gradle project", async () => {
    const fixturePath = path.resolve("tests/fixtures/workspace/java-gradle-project");
    const result = await workspaceIntelligenceGraph.invoke({
      sessionId: "session_gradle",
      userRequest: "analyze mock gradle",
      workspacePath: fixturePath,
      includeSummary: false,
    });

    expect(result.status).toBe("completed");
    expect(result.workspaceContext.languages).toContain("java");
    expect(result.workspaceContext.frameworks).toContain("springboot");
    expect(result.workspaceContext.packageManager).toBe("gradle");
    expect(result.workspaceContext.testFrameworks).toContain("junit");
    expect(result.workspaceContext.importantFiles).toContain("build.gradle");
  });
});
