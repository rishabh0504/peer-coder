import type { StructuredToolInterface } from "@langchain/core/tools";
import {
  type ToolLoopLlm,
  createToolLoopLlmFromBoundModel,
} from "../../agents/runtime/tool_loop.js";
import { ollamaInstance } from "../../providers/ollama/index.js";
import { allTools } from "../../tools/registry.js";

export const IMPLEMENTATION_TOOL_NAMES = [
  "read_file",
  "list_files",
  "search_code",
  "find_symbol",
  "find_references",
  "create_file",
  "apply_patch",
  "delete_file",
  "execute_command",
  "git_diff",
] as const;

export const RESEARCH_TOOL_NAMES = ["web_search", "fetch_webpage"] as const;

export function filterLangChainTools(names: readonly string[]): StructuredToolInterface[] {
  const set = new Set(names);
  return allTools.filter((t) => set.has(t.name)) as unknown as StructuredToolInterface[];
}

/** Ollama model bound to Implementation tools for AgentToolLoop. */
export function createImplementationBoundLlm(): ToolLoopLlm {
  const bound = ollamaInstance.bindTools(filterLangChainTools(IMPLEMENTATION_TOOL_NAMES));
  return createToolLoopLlmFromBoundModel(bound);
}

/** Ollama model bound to Research tools. */
export function createResearchBoundLlm(): ToolLoopLlm {
  const bound = ollamaInstance.bindTools(filterLangChainTools(RESEARCH_TOOL_NAMES));
  return createToolLoopLlmFromBoundModel(bound);
}
