import { createHash, randomUUID } from "node:crypto";
import type { FileRecord, SymbolEdge, SymbolRecord } from "../domain/types.js";

export class L3SymbolStore {
  private readonly files = new Map<string, FileRecord>();
  private readonly symbols = new Map<string, SymbolRecord>();
  private readonly edges = new Map<string, SymbolEdge>();

  private fileKey(workspaceId: string, path: string): string {
    return `${workspaceId}::${path}`;
  }

  upsertFile(input: Omit<FileRecord, "id" | "lastIndexedAt"> & { id?: string }): FileRecord {
    const key = this.fileKey(input.workspaceId, input.path);
    const existing = this.files.get(key);
    const record: FileRecord = {
      id: existing?.id ?? input.id ?? randomUUID(),
      workspaceId: input.workspaceId,
      path: input.path,
      language: input.language,
      sizeBytes: input.sizeBytes,
      contentHash: input.contentHash,
      lastIndexedAt: new Date().toISOString(),
    };
    this.files.set(key, record);
    return record;
  }

  upsertSymbol(input: Omit<SymbolRecord, "id"> & { id?: string }): SymbolRecord {
    const id =
      input.id ??
      createHash("sha1")
        .update(`${input.workspaceId}|${input.filePath}|${input.name}|${input.startLine}`)
        .digest("hex")
        .slice(0, 16);
    const record: SymbolRecord = { ...input, id };
    this.symbols.set(id, record);
    return record;
  }

  upsertEdge(input: Omit<SymbolEdge, "id"> & { id?: string }): SymbolEdge {
    const id =
      input.id ??
      createHash("sha1")
        .update(`${input.fromSymbolId}|${input.toSymbolId}|${input.relation}`)
        .digest("hex")
        .slice(0, 16);
    const edge: SymbolEdge = { ...input, id };
    this.edges.set(id, edge);
    return edge;
  }

  findFiles(workspaceId: string, pathHint?: string): FileRecord[] {
    const all = [...this.files.values()].filter((f) => f.workspaceId === workspaceId);
    if (!pathHint) return all;
    const hint = pathHint.toLowerCase();
    return all.filter((f) => f.path.toLowerCase().includes(hint));
  }

  findSymbols(workspaceId: string, name?: string): SymbolRecord[] {
    const all = [...this.symbols.values()].filter((s) => s.workspaceId === workspaceId);
    if (!name) return all;
    const n = name.toLowerCase();
    return all.filter((s) => s.name.toLowerCase() === n || s.name.toLowerCase().includes(n));
  }

  findEdges(workspaceId: string): SymbolEdge[] {
    return [...this.edges.values()].filter((e) => e.workspaceId === workspaceId);
  }
}
