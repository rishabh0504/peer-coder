import { beforeEach, describe, expect, it } from "vitest";
import { AgentCategory } from "../../../src/agents/domain/agent_definition.js";
import type { AgentDefinition } from "../../../src/agents/domain/agent_definition.js";
import { CapabilityRegistry } from "../../../src/agents/registry/capability_registry.js";

describe("CapabilityRegistry", () => {
  let registry: CapabilityRegistry;

  const sampleAgent: AgentDefinition = {
    id: "test_agent",
    name: "Test Agent",
    version: "1.0.0",
    description: "An agent with capability contracts.",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [
      {
        name: "test-capability",
        inputType: "WorkspaceContext",
        outputType: "WorkspaceGraph",
      },
    ],
    allowedTools: [],
    dependencies: [],
    runtime: {},
  };

  beforeEach(() => {
    registry = new CapabilityRegistry();
  });

  it("should register capabilities and resolve providers by outputType", () => {
    registry.register(sampleAgent);
    const providers = registry.findByOutput("WorkspaceGraph");
    expect(providers).toHaveLength(1);
    expect(providers[0]?.agentId).toBe("test_agent");
    expect(providers[0]?.capability).toBe("test-capability");
  });

  it("should resolve providers by inputType", () => {
    registry.register(sampleAgent);
    const providers = registry.findByInput("WorkspaceContext");
    expect(providers).toHaveLength(1);
    expect(providers[0]?.agentId).toBe("test_agent");
  });

  it("should unregister capability providers", () => {
    registry.register(sampleAgent);
    expect(registry.findByOutput("WorkspaceGraph")).toHaveLength(1);

    registry.unregister("test_agent", "1.0.0");
    expect(registry.findByOutput("WorkspaceGraph")).toHaveLength(0);
  });
});
