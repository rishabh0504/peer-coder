import type { AgentPromptPack, LayerHits } from "../domain/types.js";

export function buildAgentPromptPack(hits: LayerHits): AgentPromptPack {
  const repository: Record<string, string> = {};
  for (const fact of hits.facts) {
    repository[fact.predicate] = fact.object;
  }

  return {
    systemMemory: {
      repository,
      user: { ...hits.preferences },
      architectureRules: hits.facts
        .filter((f) => f.predicate === "rule" || f.predicate === "convention")
        .map((f) => f.object),
    },
    taskMemory: {
      execution: hits.execution,
      task: hits.task,
      files: hits.files,
      symbols: hits.symbols,
      recentDecisions: hits.task?.decisions.map((d) => d.summary) ?? [],
      recentFailures: hits.episodes.filter((e) => e.type === "failure").map((e) => e.summary),
      episodes: hits.episodes,
    },
  };
}
