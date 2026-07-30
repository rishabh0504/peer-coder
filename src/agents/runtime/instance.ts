import { agentLifecycleManager } from "../core/lifecycle.js";
import { toolRegistry } from "../domain/tool_definition.js";
import { agentHandlerRegistry } from "../handlers/handler_registry.js";
import { agentRegistry } from "../registry/agent_registry.js";
import { toolPolicyEngine } from "../security/tool_policy.js";
import { AgentRuntime } from "./agent_runtime.js";
import { MemoryEventStore } from "./event_store.js";
import { MemoryExecutionStore } from "./execution_store.js";
import { AgentExecutionTracker } from "./execution_tracker.js";

import { allTools } from "../../tools/registry.js";
import { createDefaultWorkspaceContext } from "../../workspace/context/workspace_context.js";
import { ToolPermission } from "../security/permission.js";

export const executionStore = new MemoryExecutionStore();
export const eventStore = new MemoryEventStore();
export const agentTracker = new AgentExecutionTracker(executionStore, eventStore);

// Register legacy tools into the new ToolRegistry
for (const tool of allTools) {
  let perm = ToolPermission.READ;
  if (
    tool.name.includes("create") ||
    tool.name.includes("patch") ||
    tool.name.includes("delete") ||
    tool.name.includes("write")
  ) {
    perm = ToolPermission.WRITE;
  } else if (tool.name.includes("execute") || tool.name.includes("run")) {
    perm = ToolPermission.EXECUTE;
  } else if (tool.name.includes("web") || tool.name.includes("fetch")) {
    perm = ToolPermission.NETWORK;
  }

  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    requiredPermission: perm,
    execute: async (args: unknown, options?: { signal?: AbortSignal; workspacePath?: string }) => {
      const workspaceContext = createDefaultWorkspaceContext(
        options?.workspacePath ?? process.cwd(),
      );
      return (tool as { invoke: (a: unknown, c?: unknown) => Promise<unknown> }).invoke(args, {
        signal: options?.signal,
        configurable: { workspaceContext },
      });
    },
  });
}

export const agentRuntime = new AgentRuntime(
  agentRegistry,
  agentHandlerRegistry,
  agentTracker,
  agentLifecycleManager,
  toolPolicyEngine,
  toolRegistry,
);
