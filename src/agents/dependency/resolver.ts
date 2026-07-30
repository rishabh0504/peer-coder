import semver from "semver";
import type { AgentRegistry } from "../registry/agent_registry.js";
import type { AgentDefinition } from "../domain/agent_definition.js";

export interface ExecutionPlan {
  nodes: Readonly<AgentDefinition>[];
  dependencies: Record<string, string[]>;   // "id@ver" → ["dep@ver", ...]
  levels: string[][];                        // parallel execution groups
  resolvedVersions: Record<string, string>; // "workspace-agent" → "1.5.2" (for snapshot)
}

export class AgentDependencyResolver {
  constructor(private readonly registry: AgentRegistry) {}

  resolve(agentId: string, version?: string): ExecutionPlan {
    const visited = new Set<string>();
    const ordered: Readonly<AgentDefinition>[] = [];
    const depMap: Record<string, string[]> = {};
    const resolvedVersions: Record<string, string> = {};

    this.visit(agentId, version, visited, ordered, [], depMap, resolvedVersions);

    return {
      nodes: ordered,
      dependencies: depMap,
      levels: this.buildLevels(ordered, depMap),
      resolvedVersions,
    };
  }

  private visit(
    id: string,
    version: string | undefined,
    visited: Set<string>,
    result: Readonly<AgentDefinition>[],
    stack: string[],
    depMap: Record<string, string[]>,
    resolvedVersions: Record<string, string>,
  ): void {
    const def = this.registry.get(id, version);
    const key = `${def.id}@${def.version}`;

    if (stack.includes(key)) {
      throw new Error(`Circular dependency: ${[...stack, key].join(" → ")}`);
    }
    if (visited.has(key)) return;

    stack.push(key);
    depMap[key] = [];
    resolvedVersions[def.id] = def.version; // snapshot exact resolved version

    for (const dep of def.dependencies) {
      const candidates = this.registry
        .list()
        .filter((a) => a.id === dep.agentId && semver.satisfies(a.version, dep.versionRange));

      if (candidates.length === 0) {
        throw new Error(`Unresolved dep: "${dep.agentId}@${dep.versionRange}" required by "${key}".`);
      }

      const best = candidates.sort((a, b) => semver.rcompare(a.version, b.version))[0]!;
      const depKey = `${best.id}@${best.version}`;
      depMap[key].push(depKey);
      this.visit(best.id, best.version, visited, result, [...stack], depMap, resolvedVersions);
    }

    stack.pop();
    visited.add(key);
    result.push(def);
  }

  private buildLevels(nodes: Readonly<AgentDefinition>[], depMap: Record<string, string[]>): string[][] {
    const remaining = new Set(nodes.map((n) => `${n.id}@${n.version}`));
    const completed = new Set<string>();
    const levels: string[][] = [];

    while (remaining.size > 0) {
      const level = Array.from(remaining).filter(
        (key) => (depMap[key] ?? []).every((d) => completed.has(d)),
      );
      if (level.length === 0) throw new Error("Dependency cycle detected during level building.");
      for (const key of level) { remaining.delete(key); completed.add(key); }
      levels.push(level);
    }

    return levels;
  }
}
