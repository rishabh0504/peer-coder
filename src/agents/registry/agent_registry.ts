import semver from "semver";
import { freezeDefinition, validateAgentDefinition } from "../domain/agent_definition.js";
import type { AgentDefinition } from "../domain/agent_definition.js";

export class AgentRegistry {
  private readonly agents = new Map<string, Readonly<AgentDefinition>>();
  private readonly aliases = new Map<string, string>(); // alias → "id@version"

  private key(id: string, version: string): string {
    return `${id}@${version}`;
  }

  register(definition: AgentDefinition): void {
    validateAgentDefinition(definition);
    const k = this.key(definition.id, definition.version);
    if (this.agents.has(k)) throw new Error(`Agent "${k}" already registered.`);

    const frozen = freezeDefinition(definition);
    this.agents.set(k, frozen);

    for (const alias of definition.aliases ?? []) {
      if (!this.aliases.has(alias)) {
        this.aliases.set(alias, k);
      } else {
        console.warn(`[AgentRegistry] Alias "${alias}" already taken — skipping.`);
      }
    }
  }

  get(idOrAlias: string, version?: string): Readonly<AgentDefinition> {
    // Check alias first (only when no explicit version)
    if (!version && this.aliases.has(idOrAlias)) {
      const aliasKey = this.aliases.get(idOrAlias);
      const aliased = aliasKey ? this.agents.get(aliasKey) : undefined;
      if (!aliased) throw new Error(`Agent alias "${idOrAlias}" not found.`);
      return aliased;
    }

    if (version) {
      const def = this.agents.get(this.key(idOrAlias, version));
      if (!def) throw new Error(`Agent "${idOrAlias}@${version}" not found.`);
      return def;
    }

    // Resolve highest semver — semver.rcompare is correct ("1.10.0" > "1.9.0")
    const matches = Array.from(this.agents.values()).filter((a) => a.id === idOrAlias);
    if (matches.length === 0) throw new Error(`Agent "${idOrAlias}" not found.`);
    const best = matches.sort((a, b) => semver.rcompare(a.version, b.version))[0];
    if (!best) throw new Error(`Agent "${idOrAlias}" not found.`);
    return best;
  }

  list(): Readonly<AgentDefinition>[] {
    return Array.from(this.agents.values());
  }

  unregister(id: string, version: string): void {
    const def = this.agents.get(this.key(id, version));
    if (def) {
      for (const alias of def.aliases ?? []) this.aliases.delete(alias);
    }
    this.agents.delete(this.key(id, version));
  }
}

export const agentRegistry = new AgentRegistry();
