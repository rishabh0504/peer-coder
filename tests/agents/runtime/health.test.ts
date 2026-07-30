import { beforeEach, describe, expect, it } from "vitest";

import { AgentOutcome } from "../../../src/agents/core/agent_result.js";
import {
  AgentCategory,
  type AgentDefinition,
} from "../../../src/agents/domain/agent_definition.js";
import { AgentHandlerRegistry } from "../../../src/agents/handlers/handler_registry.js";
import { AgentRegistry } from "../../../src/agents/registry/agent_registry.js";
import { checkAgentHealth } from "../../../src/agents/runtime/health.js";

describe("checkAgentHealth", () => {
  let registry: AgentRegistry;
  let handlers: AgentHandlerRegistry;

  const mockAgent: AgentDefinition = {
    id: "test_agent",
    name: "Test Agent",
    version: "1.0.0",
    description: "Sample",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [],
    dependencies: [],
    runtime: {},
  };

  beforeEach(() => {
    registry = new AgentRegistry();
    handlers = new AgentHandlerRegistry();
  });

  it("should return healthy status when handler is registered correctly", () => {
    registry.register(mockAgent);
    handlers.register("test_agent", "1.0.0", {
      execute: async () => ({ outcome: AgentOutcome.SUCCESS }),
    });

    const health = checkAgentHealth(registry, handlers);
    expect(health).toHaveLength(1);
    expect(health[0]?.status).toBe("healthy");
    expect(health[0]?.issues).toHaveLength(0);
  });

  it("should return missing-handler status when handler is missing", () => {
    registry.register(mockAgent);
    // No handler registered

    const health = checkAgentHealth(registry, handlers);
    expect(health).toHaveLength(1);
    expect(health[0]?.status).toBe("missing-handler");
    expect(health[0]?.issues[0]).toContain("No handler registered");
  });

  it("should flag invalid schemas in health checks", () => {
    const invalidAgent: AgentDefinition = {
      ...mockAgent,
      id: "invalid_agent",
      inputSchema: { safeParse: "not_a_function" } as any,
    };
    registry.register(invalidAgent);

    const health = checkAgentHealth(registry, handlers);
    const agentHealth = health.find((h) => h.agentId === "invalid_agent");
    expect(agentHealth).toBeDefined();
    expect(agentHealth?.status).toBe("missing-handler"); // missing handler + invalid schema issues
    expect(agentHealth?.issues).toContain("inputSchema is not a valid Zod schema");
  });
});
