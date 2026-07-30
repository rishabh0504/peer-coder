import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  createImplementationBoundLlm,
  createResearchBoundLlm,
} from "../../integration/llms/agent_model.js";
import { createMemoryManager } from "../../memory/index.js";
import { ollamaInstance } from "../../providers/ollama/index.js";
import { createDefaultWorkspaceContext } from "../../workspace/context/workspace_context.js";
import type {
  AgentContainer,
  LLMService,
  MemoryService,
  ToolService,
} from "../core/execution_context.js";
import { toolRegistry } from "../domain/tool_definition.js";
import type { ToolLoopLlm } from "./tool_loop.js";

export interface AgentContainerExtras {
  toolLoopLlm?: ToolLoopLlm;
  researchToolLoopLlm?: ToolLoopLlm;
  workspacePath?: string;
}

export function createAgentContainerForCLI(
  _sessionId: string,
  workspacePath: string = process.cwd(),
): AgentContainer & AgentContainerExtras {
  const localMemory = new Map<string, unknown>();
  const memoryManager = createMemoryManager();
  const workspaceContext = createDefaultWorkspaceContext(workspacePath, _sessionId);

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
      return tool.execute(args, {
        signal: options?.signal,
        workspacePath: workspaceContext.workspaceRoot,
      });
    },
  };

  const llm: LLMService = {
    async generate(prompt: string, options?: { signal?: AbortSignal }) {
      const res = await ollamaInstance.invoke(
        [new SystemMessage("You are a coding assistant."), new HumanMessage(prompt)],
        options?.signal ? { signal: options.signal } : undefined,
      );
      return typeof res.content === "string" ? res.content : String(res.content ?? "");
    },
  };

  return {
    tools: toolService,
    memory: memoryService,
    memoryManager: memoryManager as AgentContainer["memoryManager"],
    llm,
    toolLoopLlm: createImplementationBoundLlm(),
    researchToolLoopLlm: createResearchBoundLlm(),
    workspacePath: workspaceContext.workspaceRoot,
  };
}

/** @deprecated Prefer createAgentContainerForCLI */
export const AgentContainerFactory = {
  createForCLI: createAgentContainerForCLI,
};
