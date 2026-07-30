export interface PromptEntry {
  id: string;
  version: string;
  content: string;
  variables?: string[];
}

export class PromptRegistry {
  private readonly prompts = new Map<string, PromptEntry>();

  private key(id: string, version: string) {
    return `${id}@${version}`;
  }

  register(entry: PromptEntry): void {
    const k = this.key(entry.id, entry.version);
    if (this.prompts.has(k)) throw new Error(`Prompt "${k}" already registered.`);
    this.prompts.set(k, Object.freeze(entry));
  }

  get(id: string, version?: string): PromptEntry {
    if (version) {
      const p = this.prompts.get(this.key(id, version));
      if (!p) throw new Error(`Prompt "${id}@${version}" not found.`);
      return p;
    }
    const matches = Array.from(this.prompts.values()).filter((p) => p.id === id);
    if (matches.length === 0) throw new Error(`Prompt "${id}" not found.`);
    const best = matches.sort((a, b) => b.version.localeCompare(a.version))[0];
    if (!best) throw new Error(`Prompt "${id}" not found.`);
    return best;
  }
}

export const promptRegistry = new PromptRegistry();
