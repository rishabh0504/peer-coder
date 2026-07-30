import { describe, it, expect, beforeEach } from "vitest";
import { ToolPolicyEngine } from "../../../src/agents/security/tool_policy.js";
import { ToolPermission } from "../../../src/agents/security/permission.js";
import { AgentCategory } from "../../../src/agents/domain/agent_definition.js";
import type { AgentDefinition } from "../../../src/agents/domain/agent_definition.js";
import type { ToolDefinition } from "../../../src/agents/domain/tool_definition.js";

describe("ToolPolicyEngine", () => {
  let policyEngine: ToolPolicyEngine;

  const mockAgent: AgentDefinition = {
    id: "sample_agent",
    name: "Sample Agent",
    version: "1.0.0",
    description: "An agent with specified allowedTools permissions.",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [
      { name: "filesystem.read", permission: "read" },
      { name: "filesystem.write", permission: "write" },
      { name: "terminal.*", permission: "execute" },
      { name: "network.*", permission: "network" },
    ],
    dependencies: [],
    runtime: {},
  };

  const createMockTool = (name: string, permission: ToolPermission): ToolDefinition => ({
    name,
    requiredPermission: permission,
    execute: async () => ({}),
  });

  beforeEach(() => {
    policyEngine = new ToolPolicyEngine();
  });

  it("should permit tool calls matching exact names with valid permissions", () => {
    const tool = createMockTool("filesystem.read", ToolPermission.READ);
    expect(() => policyEngine.validate(mockAgent, tool)).not.toThrow();
  });

  it("should permit tool calls matching exact names with higher escalation permissions", () => {
    // WRITE permission grants READ
    const tool = createMockTool("filesystem.write", ToolPermission.READ);
    expect(() => policyEngine.validate(mockAgent, tool)).not.toThrow();
  });

  it("should reject tool calls matching exact names with insufficient permission levels", () => {
    // READ permission does NOT grant WRITE
    const tool = createMockTool("filesystem.read", ToolPermission.WRITE);
    expect(() => policyEngine.validate(mockAgent, tool)).toThrow(
      "but tool requires \"write\""
    );
  });

  it("should permit wildcard prefix matches with valid permissions", () => {
    const tool = createMockTool("terminal.run", ToolPermission.EXECUTE);
    expect(() => policyEngine.validate(mockAgent, tool)).not.toThrow();
  });

  it("should reject network calls requesting write permission if granted only network", () => {
    const tool = createMockTool("network.fetch", ToolPermission.WRITE);
    expect(() => policyEngine.validate(mockAgent, tool)).toThrow();
  });

  it("should permit network calls requesting network permission when granted network", () => {
    const tool = createMockTool("network.fetch", ToolPermission.NETWORK);
    expect(() => policyEngine.validate(mockAgent, tool)).not.toThrow();
  });

  it("should reject tools not declared inallowedTools list", () => {
    const tool = createMockTool("db.query", ToolPermission.READ);
    expect(() => policyEngine.validate(mockAgent, tool)).toThrow("not in allowedTools");
  });
});
