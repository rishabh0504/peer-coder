import { createHash } from "node:crypto";
import type { MemoryConfidence, MemorySource } from "../domain/types.js";

export interface RepositoryFact {
  id: string;
  workspaceId: string;
  subject: string;
  predicate: string;
  object: string;
  source: MemorySource;
  confidence: number;
  validFrom: string;
  validUntil?: string;
}

export interface UserPreference {
  workspaceId: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface EpisodeRecord {
  id: string;
  workspaceId: string;
  type: string;
  summary: string;
  createdAt: string;
}

/** In-process L2 facts (Stage 2 offline default). */
export class L2FactStore {
  private facts: RepositoryFact[] = [];

  upsert(input: Omit<RepositoryFact, "id" | "validFrom"> & { id?: string }): RepositoryFact {
    const now = new Date().toISOString();
    // supersede current matching triple
    for (const f of this.facts) {
      if (
        f.workspaceId === input.workspaceId &&
        f.subject === input.subject &&
        f.predicate === input.predicate &&
        !f.validUntil
      ) {
        f.validUntil = now;
      }
    }
    const row: RepositoryFact = {
      id:
        input.id ??
        createHash("sha1")
          .update(`${input.workspaceId}:${input.subject}:${input.predicate}:${now}`)
          .digest("hex")
          .slice(0, 16),
      workspaceId: input.workspaceId,
      subject: input.subject,
      predicate: input.predicate,
      object: input.object,
      source: input.source,
      confidence: input.confidence,
      validFrom: now,
    };
    this.facts.push(row);
    return row;
  }

  current(workspaceId: string, predicate?: string): RepositoryFact[] {
    return this.facts.filter(
      (f) =>
        f.workspaceId === workspaceId && !f.validUntil && (!predicate || f.predicate === predicate),
    );
  }
}

export class L5PreferenceStore {
  private prefs = new Map<string, UserPreference>();

  private key(workspaceId: string, k: string) {
    return `${workspaceId}::${k}`;
  }

  set(workspaceId: string, key: string, value: string): UserPreference {
    const row: UserPreference = {
      workspaceId,
      key,
      value,
      updatedAt: new Date().toISOString(),
    };
    this.prefs.set(this.key(workspaceId, key), row);
    return row;
  }

  get(workspaceId: string, key?: string): UserPreference[] {
    if (key) {
      const row = this.prefs.get(this.key(workspaceId, key));
      return row ? [row] : [];
    }
    return [...this.prefs.values()].filter((p) => p.workspaceId === workspaceId);
  }
}

export class L4EpisodeStore {
  private episodes: EpisodeRecord[] = [];

  add(input: Omit<EpisodeRecord, "id" | "createdAt"> & { id?: string }): EpisodeRecord {
    const row: EpisodeRecord = {
      id:
        input.id ??
        createHash("sha1").update(`${input.summary}:${Date.now()}`).digest("hex").slice(0, 16),
      workspaceId: input.workspaceId,
      type: input.type,
      summary: input.summary,
      createdAt: new Date().toISOString(),
    };
    this.episodes.push(row);
    return row;
  }

  list(workspaceId: string, type?: string): EpisodeRecord[] {
    return this.episodes.filter((e) => e.workspaceId === workspaceId && (!type || e.type === type));
  }

  /** Last-resort text match (vector deferred). */
  match(workspaceId: string, query: string, limit = 5): EpisodeRecord[] {
    const q = query.toLowerCase();
    return this.list(workspaceId)
      .filter((e) => e.summary.toLowerCase().includes(q))
      .slice(0, limit);
  }
}

export function createDefaultConfidence(source: MemorySource, confidence = 0.8): MemoryConfidence {
  return { source, confidence };
}
