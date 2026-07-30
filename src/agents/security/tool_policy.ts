import type { AgentDefinition } from "../domain/agent_definition.js";
import type { ToolDefinition } from "../domain/tool_definition.js";
import { type ToolPermission, isPermissionGranted } from "./permission.js";

export class ToolPolicyEngine {
  private matchGlob(pattern: string, toolName: string): boolean {
    if (pattern === "*") return true;
    if (pattern.endsWith(".*")) return toolName.startsWith(pattern.slice(0, -1));
    return pattern === toolName;
  }

  /**
   * Validates that `agent` is allowed to call `tool` with its declared permission level.
   * Uses tool.requiredPermission — not a hardcoded EXECUTE for everything.
   */
  validate(agent: AgentDefinition, tool: ToolDefinition): void {
    const requested = tool.requiredPermission;
    for (const allowed of agent.allowedTools) {
      if (!this.matchGlob(allowed.name, tool.name)) continue;
      if (isPermissionGranted(allowed.permission as ToolPermission, requested)) return;
      throw new Error(
        `Agent "${agent.id}" has "${allowed.permission}" on "${tool.name}" ` +
          `but tool requires "${requested}". Check PERMISSION_MATRIX.`,
      );
    }
    throw new Error(`Tool "${tool.name}" not in allowedTools for agent "${agent.id}".`);
  }
}

export const toolPolicyEngine = new ToolPolicyEngine();
