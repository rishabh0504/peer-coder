import { randomUUID } from "node:crypto";
import {
  ARTIFACT_SCHEMAS,
  ARTIFACT_SCHEMA_VERSION,
  type ArtifactEnvelope,
  type ArtifactKind,
} from "./types.js";

export class ArtifactStore {
  private byId = new Map<string, ArtifactEnvelope>();
  private byTask = new Map<string, string[]>();

  put<T>(input: {
    taskId: string;
    kind: ArtifactKind;
    producerAgentId: string;
    data: T;
  }): ArtifactEnvelope<T> {
    const schema = ARTIFACT_SCHEMAS[input.kind];
    const data = schema.parse(input.data) as T;
    const envelope: ArtifactEnvelope<T> = {
      id: randomUUID(),
      taskId: input.taskId,
      kind: input.kind,
      createdAt: new Date().toISOString(),
      producerAgentId: input.producerAgentId,
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      data,
    };
    this.byId.set(envelope.id, envelope as ArtifactEnvelope);
    const list = this.byTask.get(input.taskId) ?? [];
    list.push(envelope.id);
    this.byTask.set(input.taskId, list);
    return envelope;
  }

  get<T = unknown>(id: string): ArtifactEnvelope<T> | null {
    return (this.byId.get(id) as ArtifactEnvelope<T> | undefined) ?? null;
  }

  listByTask(taskId: string): ArtifactEnvelope[] {
    return (this.byTask.get(taskId) ?? [])
      .map((id) => this.byId.get(id))
      .filter((a): a is ArtifactEnvelope => Boolean(a));
  }

  latestByKind<T = unknown>(taskId: string, kind: ArtifactKind): ArtifactEnvelope<T> | null {
    const items = this.listByTask(taskId).filter((a) => a.kind === kind);
    if (items.length === 0) return null;
    return items[items.length - 1] as ArtifactEnvelope<T>;
  }

  getMany(ids: string[]): ArtifactEnvelope[] {
    return ids.map((id) => this.byId.get(id)).filter((a): a is ArtifactEnvelope => Boolean(a));
  }
}

let singleton: ArtifactStore | null = null;

export function getArtifactStore(): ArtifactStore {
  if (!singleton) singleton = new ArtifactStore();
  return singleton;
}

export function resetArtifactStoreForTests(): void {
  singleton = new ArtifactStore();
}
