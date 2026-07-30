import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AgentOutcome } from "../../../src/agents/core/agent_result.js";
import { AgentLifecycleManager } from "../../../src/agents/core/lifecycle.js";
import {
  AgentCategory,
  type AgentDefinition,
} from "../../../src/agents/domain/agent_definition.js";
import { ToolRegistry } from "../../../src/agents/domain/tool_definition.js";
import { AgentHandlerRegistry } from "../../../src/agents/handlers/handler_registry.js";
import type { AgentHandler } from "../../../src/agents/handlers/handler_registry.js";
import { AgentRegistry } from "../../../src/agents/registry/agent_registry.js";
import { AgentRuntime } from "../../../src/agents/runtime/agent_runtime.js";
import { MemoryEventStore } from "../../../src/agents/runtime/event_store.js";
import { MemoryExecutionStore } from "../../../src/agents/runtime/execution_store.js";
import { AgentExecutionTracker } from "../../../src/agents/runtime/execution_tracker.js";
import type { AgentMiddleware } from "../../../src/agents/runtime/middleware.js";
import { ToolPermission } from "../../../src/agents/security/permission.js";
import { ToolPolicyEngine } from "../../../src/agents/security/tool_policy.js";

describe("AgentRuntime", () => {
  let registry: AgentRegistry;
  let handlers: AgentHandlerRegistry;
  let tracker: AgentExecutionTracker;
  let executionStore: MemoryExecutionStore;
  let eventStore: MemoryEventStore;
  let lifecycle: AgentLifecycleManager;
  let policy: ToolPolicyEngine;
  let toolReg: ToolRegistry;
  let runtime: AgentRuntime;

  const mockAgentDef: AgentDefinition = {
    id: "test_agent",
    name: "Test Agent",
    version: "1.0.0",
    description: "Sample",
    category: AgentCategory.ANALYSIS,
    status: "stable",
    capabilities: [],
    allowedTools: [{ name: "test_tool", permission: "execute" }],
    dependencies: [],
    inputSchema: z.object({
      field: z.string().default("default_value"),
    }),
    outputSchema: z.object({
      result: z.string(),
    }),
    runtime: {
      memoryPolicy: {
        enabled: true,
        namespace: "test-ns",
      },
    },
  };

  const mockHandler: AgentHandler = {
    execute: async (state: any, context) => {
      if (context.signal.aborted) {
        return { outcome: AgentOutcome.CANCELLED };
      }
      return {
        outcome: AgentOutcome.SUCCESS,
        data: { result: `Hello ${state.field}` },
      };
    },
  };

  const mockTool = {
    name: "test_tool",
    requiredPermission: ToolPermission.EXECUTE,
    execute: async (args: any) => `tool_success_${args}`,
  };

  beforeEach(() => {
    registry = new AgentRegistry();
    handlers = new AgentHandlerRegistry();
    executionStore = new MemoryExecutionStore();
    eventStore = new MemoryEventStore();
    tracker = new AgentExecutionTracker(executionStore, eventStore);
    lifecycle = new AgentLifecycleManager();
    policy = new ToolPolicyEngine();
    toolReg = new ToolRegistry();

    registry.register(mockAgentDef);
    handlers.register("test_agent", "1.0.0", mockHandler);
    toolReg.register(mockTool);

    runtime = new AgentRuntime(registry, handlers, tracker, lifecycle, policy, toolReg);
  });

  it("should return an execution handle immediately (race-free) and run the execution successfully", async () => {
    const memoryMock = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    const context = {
      sessionId: "session_123",
      metadata: {},
      container: {
        tools: { execute: vi.fn() },
        memory: memoryMock,
      },
    };

    const handle = runtime.execute("test_agent", {}, context);
    expect(handle.id).toBeDefined();
    expect(typeof handle.cancel).toBe("function");

    const execResult = await handle.result();
    expect(execResult.outcome).toBe(AgentOutcome.SUCCESS);
    expect(execResult.data).toEqual({ result: "Hello default_value" });
    expect(execResult.execution.id).toBe(handle.id);
  });

  it("should enforce input schema transformation and capture default values", async () => {
    const context = {
      sessionId: "session_123",
      metadata: {},
      container: {
        tools: { execute: vi.fn() },
        memory: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      },
    };

    const handle = runtime.execute("test_agent", {}, context);
    const result = await handle.result();
    expect(result.data).toEqual({ result: "Hello default_value" });
  });

  it("should enforce lifecycle disabled throws", () => {
    const disabledAgent: AgentDefinition = {
      ...mockAgentDef,
      id: "disabled_agent",
      status: "disabled",
    };
    registry.register(disabledAgent);
    handlers.register("disabled_agent", "1.0.0", mockHandler);

    expect(() =>
      runtime.execute(
        "disabled_agent",
        {},
        {
          sessionId: "s",
          metadata: {},
          container: {
            tools: { execute: vi.fn() },
            memory: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
          },
        },
      ),
    ).toThrow("is disabled");
  });

  it("should cancel execution cleanly using AbortSignal propagation", async () => {
    const slowHandler: AgentHandler = {
      execute: async (_state, context) => {
        // Mock a slow operation checking cancellation signal
        for (let i = 0; i < 50; i++) {
          if (context.signal.aborted) {
            throw new Error("aborted");
          }
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return { outcome: AgentOutcome.SUCCESS };
      },
    };

    handlers.unregister("test_agent", "1.0.0");
    handlers.register("test_agent", "1.0.0", slowHandler);

    const context = {
      sessionId: "session_123",
      metadata: {},
      container: {
        tools: { execute: vi.fn() },
        memory: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      },
    };

    const handle = runtime.execute("test_agent", {}, context);
    // Cancel immediately
    handle.cancel();

    const result = await handle.result();
    expect(result.outcome).toBe(AgentOutcome.CANCELLED);
  });

  it("should isolate lifecycle hook errors and not corrupt execution flow", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const faultyHooks: AgentHandler = {
      execute: async () => ({
        outcome: AgentOutcome.SUCCESS,
        data: { result: "Hello" },
      }),
      hooks: {
        beforeExecute: async () => {
          throw new Error("Lifecycle crashed");
        },
      },
    };

    handlers.unregister("test_agent", "1.0.0");
    handlers.register("test_agent", "1.0.0", faultyHooks);

    const context = {
      sessionId: "session_123",
      metadata: {},
      container: {
        tools: { execute: vi.fn() },
        memory: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      },
    };

    try {
      const handle = runtime.execute("test_agent", { field: "test" }, context);
      const result = await handle.result();
      expect(result.outcome).toBe(AgentOutcome.SUCCESS); // still successful!
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("should execute middleware ordered by descending priority", async () => {
    const middlewareLog: string[] = [];

    const mw1: AgentMiddleware = {
      priority: 10,
      execute: async (_ctx, next) => {
        middlewareLog.push("mw1_before");
        const res = await next();
        middlewareLog.push("mw1_after");
        return res;
      },
    };

    const mw2: AgentMiddleware = {
      priority: 100, // runs first because 100 > 10
      execute: async (_ctx, next) => {
        middlewareLog.push("mw2_before");
        const res = await next();
        middlewareLog.push("mw2_after");
        return res;
      },
    };

    runtime.use(mw1);
    runtime.use(mw2);

    const context = {
      sessionId: "session_123",
      metadata: {},
      container: {
        tools: { execute: vi.fn() },
        memory: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      },
    };

    const handle = runtime.execute("test_agent", { field: "world" }, context);
    await handle.result();

    expect(middlewareLog).toEqual(["mw2_before", "mw1_before", "mw1_after", "mw2_after"]);
  });

  it("should enforce session-scoped memory namespaces", async () => {
    const memoryStore = new Map<string, any>();
    const scopedMemory = {
      get: async (key: string) => memoryStore.get(key),
      set: async (key: string, val: any) => {
        memoryStore.set(key, val);
      },
      delete: async (key: string) => {
        memoryStore.delete(key);
      },
    };

    const memoryAgent: AgentHandler = {
      execute: async (_state, context) => {
        await context.container.memory.set("foo", "bar");
        return { outcome: AgentOutcome.SUCCESS, data: { result: "stored" } };
      },
    };

    handlers.unregister("test_agent", "1.0.0");
    handlers.register("test_agent", "1.0.0", memoryAgent);

    const context = {
      sessionId: "session_abc",
      metadata: {},
      container: {
        tools: { execute: vi.fn() },
        memory: scopedMemory,
      },
    };

    const handle = runtime.execute("test_agent", { field: "test" }, context);
    await handle.result();

    // Key should be session_abc/test-ns/foo
    expect(memoryStore.get("session_abc/test-ns/foo")).toBe("bar");
  });
});
