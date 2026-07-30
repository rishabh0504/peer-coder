import type { ToolPermission } from "../security/permission.js";

export interface ToolDefinition {
  name: string;
  description?: string;
  requiredPermission: ToolPermission;
  execute(
    args: unknown,
    options?: { signal?: AbortSignal; workspacePath?: string },
  ): Promise<unknown>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

export const toolRegistry = new ToolRegistry();
