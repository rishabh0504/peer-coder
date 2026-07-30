import type { AgentDefinition } from "../domain/agent_definition.js";

export interface CapabilityProvider {
  capability: string;
  inputType: string;
  outputType: string;
  agentId: string;
  version: string;
}

export class CapabilityRegistry {
  private readonly byOutput = new Map<string, CapabilityProvider[]>();
  private readonly byInput = new Map<string, CapabilityProvider[]>();

  register(definition: AgentDefinition): void {
    for (const cap of definition.capabilities) {
      const entry: CapabilityProvider = {
        capability: cap.name,
        inputType: cap.inputType,
        outputType: cap.outputType,
        agentId: definition.id,
        version: definition.version,
      };
      const out = this.byOutput.get(cap.outputType) ?? [];
      out.push(entry);
      this.byOutput.set(cap.outputType, out);

      const inp = this.byInput.get(cap.inputType) ?? [];
      inp.push(entry);
      this.byInput.set(cap.inputType, inp);
    }
  }

  findByOutput(outputType: string): CapabilityProvider[] {
    return this.byOutput.get(outputType) ?? [];
  }

  findByInput(inputType: string): CapabilityProvider[] {
    return this.byInput.get(inputType) ?? [];
  }

  unregister(agentId: string, version: string): void {
    for (const [key, providers] of this.byOutput.entries()) {
      const f = providers.filter((p) => !(p.agentId === agentId && p.version === version));
      if (f.length === 0) {
        this.byOutput.delete(key);
      } else {
        this.byOutput.set(key, f);
      }
    }
    for (const [key, providers] of this.byInput.entries()) {
      const f = providers.filter((p) => !(p.agentId === agentId && p.version === version));
      if (f.length === 0) {
        this.byInput.delete(key);
      } else {
        this.byInput.set(key, f);
      }
    }
  }
}

export const capabilityRegistry = new CapabilityRegistry();
