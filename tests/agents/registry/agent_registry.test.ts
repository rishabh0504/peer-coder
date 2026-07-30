import { beforeEach, describe, expect, it } from "vitest";
import { AgentCategory } from "../../../src/agents/domain/agent_definition.js";
import type { AgentDefinition } from "../../../src/agents/domain/agent_definition.js";
import { AgentRegistry } from "../../../src/agents/registry/agent_registry.js";

describe("AgentRegistry", () => {
  let registry: AgentRegistry;

  const sampleAgent1: AgentDefinition = {
    id: "sample_agent",
    name: "Sample Agent",
    version: "1.0.0",
    aliases: ["sample_one"],
    description: "A sample testing agent.",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [],
    dependencies: [],
    runtime: {},
  };

  const sampleAgent2: AgentDefinition = {
    id: "sample_agent",
    name: "Sample Agent v2",
    version: "2.0.0",
    description: "Another sample testing agent.",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [],
    dependencies: [],
    runtime: {},
  };

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it("should register and retrieve an agent definition by explicit id and version", () => {
    registry.register(sampleAgent1);
    const retrieved = registry.get("sample_agent", "1.0.0");
    expect(retrieved.name).toBe("Sample Agent");
  });

  it("should freeze agent definition upon registration to prevent mutations", () => {
    registry.register(sampleAgent1);
    const retrieved = registry.get("sample_agent", "1.0.0");
    expect(Object.isFrozen(retrieved)).toBe(true);
    expect(Object.isFrozen(retrieved.capabilities)).toBe(true);
  });

  it("should fail to register duplicate id and version", () => {
    registry.register(sampleAgent1);
    expect(() => registry.register(sampleAgent1)).toThrow("already registered");
  });

  it("should resolve the highest semver when version is omitted", () => {
    registry.register(sampleAgent1);
    registry.register(sampleAgent2);
    const resolved = registry.get("sample_agent");
    expect(resolved.version).toBe("2.0.0");
  });

  it("should resolve via alias when version is omitted", () => {
    registry.register(sampleAgent1);
    const resolved = registry.get("sample_one");
    expect(resolved.id).toBe("sample_agent");
    expect(resolved.version).toBe("1.0.0");
  });

  it("should throw error for non-existent agents", () => {
    expect(() => registry.get("non_existent")).toThrow("not found");
  });

  it("should unregister an agent by id and version and clean up aliases", () => {
    registry.register(sampleAgent1);
    expect(registry.get("sample_one")).toBeDefined();

    registry.unregister("sample_agent", "1.0.0");
    expect(() => registry.get("sample_agent", "1.0.0")).toThrow();
    expect(() => registry.get("sample_one")).toThrow();
  });
});
