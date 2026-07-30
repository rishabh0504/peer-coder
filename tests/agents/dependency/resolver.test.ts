import { beforeEach, describe, expect, it } from "vitest";
import { AgentDependencyResolver } from "../../../src/agents/dependency/resolver.js";
import { AgentCategory } from "../../../src/agents/domain/agent_definition.js";
import type { AgentDefinition } from "../../../src/agents/domain/agent_definition.js";
import { AgentRegistry } from "../../../src/agents/registry/agent_registry.js";

describe("AgentDependencyResolver", () => {
  let registry: AgentRegistry;
  let resolver: AgentDependencyResolver;

  const agentA: AgentDefinition = {
    id: "agent_a",
    name: "Agent A",
    version: "1.0.0",
    description: "Sample",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [],
    dependencies: [{ agentId: "agent_b", versionRange: "^1.0.0" }],
    runtime: {},
  };

  const agentB: AgentDefinition = {
    id: "agent_b",
    name: "Agent B",
    version: "1.2.0",
    description: "Sample",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [],
    dependencies: [{ agentId: "agent_c", versionRange: ">=1.0.0" }],
    runtime: {},
  };

  const agentC: AgentDefinition = {
    id: "agent_c",
    name: "Agent C",
    version: "1.0.1",
    description: "Sample",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [],
    dependencies: [],
    runtime: {},
  };

  const cyclicAgentA: AgentDefinition = {
    id: "cyclic_a",
    name: "Cyclic A",
    version: "1.0.0",
    description: "Sample",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [],
    dependencies: [{ agentId: "cyclic_b", versionRange: "*" }],
    runtime: {},
  };

  const cyclicAgentB: AgentDefinition = {
    id: "cyclic_b",
    name: "Cyclic B",
    version: "1.0.0",
    description: "Sample",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [],
    dependencies: [{ agentId: "cyclic_a", versionRange: "*" }],
    runtime: {},
  };

  beforeEach(() => {
    registry = new AgentRegistry();
    resolver = new AgentDependencyResolver(registry);
  });

  it("should resolve linear transitive dependencies in correct topological order", () => {
    registry.register(agentA);
    registry.register(agentB);
    registry.register(agentC);

    const plan = resolver.resolve("agent_a", "1.0.0");
    expect(plan.nodes.map((n) => n.id)).toEqual(["agent_c", "agent_b", "agent_a"]);
  });

  it("should output parallel execution levels correctly", () => {
    registry.register(agentA);
    registry.register(agentB);
    registry.register(agentC);

    const plan = resolver.resolve("agent_a", "1.0.0");
    expect(plan.levels).toEqual([["agent_c@1.0.1"], ["agent_b@1.2.0"], ["agent_a@1.0.0"]]);
  });

  it("should snapshot the exact resolved version mappings", () => {
    registry.register(agentA);
    registry.register(agentB);
    registry.register(agentC);

    const plan = resolver.resolve("agent_a", "1.0.0");
    expect(plan.resolvedVersions).toEqual({
      agent_a: "1.0.0",
      agent_b: "1.2.0",
      agent_c: "1.0.1",
    });
  });

  it("should throw an error when a circular dependency is detected", () => {
    registry.register(cyclicAgentA);
    registry.register(cyclicAgentB);

    expect(() => resolver.resolve("cyclic_a")).toThrow("Circular dependency");
  });

  it("should throw an error for unresolved dependencies", () => {
    registry.register(agentA);
    // agentB is missing
    expect(() => resolver.resolve("agent_a")).toThrow("Unresolved dep");
  });
});
