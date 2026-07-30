import { getArtifactStore } from "../agents/artifacts/index.js";
import type { ArtifactKind } from "../agents/artifacts/types.js";
import type { AgentPromptPack } from "../memory/domain/types.js";
import type { InMemoryMemoryManager } from "../memory/memory_manager.js";
import { getWorkspaceGraph } from "../workspace/graph/index.js";

/** Which artifact kinds each agent may see */
export const AGENT_ARTIFACT_KINDS: Record<string, ArtifactKind[]> = {
  workspace_intelligence: ["repository_profile"],
  code_intelligence: ["repository_profile", "code_intel"],
  research: ["repository_profile", "code_intel", "research"],
  planning: ["repository_profile", "code_intel", "research", "plan"],
  implementation: ["repository_profile", "code_intel", "research", "plan", "implementation"],
  verification: ["plan", "implementation", "verification"],
  debugging: ["plan", "implementation", "verification", "debug"],
  orchestrator: [
    "repository_profile",
    "code_intel",
    "research",
    "plan",
    "implementation",
    "verification",
    "orchestrator",
    "debug",
  ],
};

export interface ContextEnginePack {
  systemMemory: AgentPromptPack["systemMemory"];
  taskMemory: AgentPromptPack["taskMemory"];
  artifactSlice: Partial<Record<ArtifactKind, unknown>>;
  promptText: string;
}

/**
 * Sole prompt assembler for child LLM agents.
 * Loads typed artifacts — never pasted prose handoffs.
 */
export class ContextEngine {
  constructor(private readonly memory?: InMemoryMemoryManager) {}

  async buildForAgent(opts: {
    agentId: string;
    taskId: string;
    artifactIds?: string[];
    workspacePath: string;
    userRequest?: string;
  }): Promise<ContextEnginePack> {
    const store = getArtifactStore();
    const allowed = new Set(
      AGENT_ARTIFACT_KINDS[opts.agentId] ?? AGENT_ARTIFACT_KINDS.orchestrator ?? [],
    );
    const envelopes =
      opts.artifactIds && opts.artifactIds.length > 0
        ? store.getMany(opts.artifactIds)
        : store.listByTask(opts.taskId);

    const artifactSlice: Partial<Record<ArtifactKind, unknown>> = {};
    for (const env of envelopes) {
      if (!allowed.has(env.kind)) continue;
      artifactSlice[env.kind] = env.data;
    }

    let promptPack: AgentPromptPack | null = null;
    if (this.memory) {
      try {
        promptPack = await this.memory.planAndRecall(opts.userRequest ?? opts.agentId, {
          workspaceId: opts.workspacePath,
          executionId: `ctx_${opts.taskId}`,
          taskId: opts.taskId,
        });
      } catch {
        promptPack = null;
      }
    }

    const systemMemory = promptPack?.systemMemory ?? {
      repository: {},
      user: {},
      architectureRules: [],
    };
    const taskMemory = promptPack?.taskMemory ?? {
      files: [],
      symbols: [],
      recentDecisions: [],
      recentFailures: [],
      episodes: [],
    };

    // Enrich systemMemory from repository profile artifact
    const profile = artifactSlice.repository_profile as
      | { languages?: string[]; packageManager?: string; frameworks?: string[] }
      | undefined;
    if (profile) {
      if (profile.languages?.length)
        systemMemory.repository.languages = profile.languages.join(", ");
      if (profile.packageManager) systemMemory.repository.packageManager = profile.packageManager;
      if (profile.frameworks?.length)
        systemMemory.repository.frameworks = profile.frameworks.join(", ");
    }

    const graph = getWorkspaceGraph();
    const liveProfile = await graph.getRepositoryProfile(opts.workspacePath);
    if (liveProfile && !artifactSlice.repository_profile) {
      artifactSlice.repository_profile = liveProfile;
    }

    const promptText = serializeForPrompt(opts.agentId, artifactSlice, opts.userRequest);

    return { systemMemory, taskMemory, artifactSlice, promptText };
  }
}

function serializeForPrompt(
  agentId: string,
  slice: Partial<Record<ArtifactKind, unknown>>,
  userRequest?: string,
): string {
  const parts: string[] = [`You are the ${agentId} agent.`];
  if (userRequest) parts.push(`User request:\n${userRequest}`);
  for (const [kind, data] of Object.entries(slice)) {
    if (!data) continue;
    parts.push(`\n## Artifact: ${kind}\n${JSON.stringify(data, null, 2).slice(0, 6000)}`);
  }
  return parts.join("\n");
}

export function createContextEngine(memory?: InMemoryMemoryManager): ContextEngine {
  return new ContextEngine(memory);
}
