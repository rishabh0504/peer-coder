import type { AgentContainer, ToolService, MemoryService } from "../core/execution_context.js";
import { toolRegistry } from "../domain/tool_definition.js";

export class AgentContainerFactory {
  static createForCLI(_sessionId: string): AgentContainer {
    // In-memory memory service scoped per runtime execution
    const localMemory = new Map<string, unknown>();

    const memoryService: MemoryService = {
      get: async (key: string) => localMemory.get(key),
      set: async (key: string, value: unknown) => {
        localMemory.set(key, value);
      },
      delete: async (key: string) => {
        localMemory.delete(key);
      },
    };

    const toolService: ToolService = {
      execute: async (name: string, args: unknown, options?: { signal?: AbortSignal }) => {
        const tool = toolRegistry.get(name);
        if (!tool) {
          throw new Error(`Tool "${name}" is not registered.`);
        }
        return tool.execute(args, { signal: options?.signal });
      },
    };

    return {
      tools: toolService,
      memory: memoryService,
    };
  }
}
