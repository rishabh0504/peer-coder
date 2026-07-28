import type { WorkspacePermissions } from "@workspace/workspace_context.js";

export enum DangerLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface PolicyRule {
  toolName: string;
  dangerLevel: DangerLevel;
  requiredPermission: keyof WorkspacePermissions;
}

export class PolicyEngine {
  private rules = new Map<string, PolicyRule>([
    [
      "read_file",
      { toolName: "read_file", dangerLevel: DangerLevel.LOW, requiredPermission: "read" },
    ],
    [
      "list_files",
      { toolName: "list_files", dangerLevel: DangerLevel.LOW, requiredPermission: "read" },
    ],
    [
      "create_file",
      { toolName: "create_file", dangerLevel: DangerLevel.MEDIUM, requiredPermission: "write" },
    ],
    [
      "apply_patch",
      { toolName: "apply_patch", dangerLevel: DangerLevel.MEDIUM, requiredPermission: "write" },
    ],
    [
      "delete_file",
      { toolName: "delete_file", dangerLevel: DangerLevel.HIGH, requiredPermission: "delete" },
    ],
    [
      "execute_command",
      {
        toolName: "execute_command",
        dangerLevel: DangerLevel.CRITICAL,
        requiredPermission: "execute",
      },
    ],
  ]);

  public getRule(toolName: string): PolicyRule {
    return (
      this.rules.get(toolName) || {
        toolName,
        dangerLevel: DangerLevel.MEDIUM,
        requiredPermission: "write",
      }
    );
  }

  public validatePolicy(permissions: WorkspacePermissions, toolName: string): void {
    const rule = this.getRule(toolName);
    const hasPermission = permissions[rule.requiredPermission];

    if (!hasPermission) {
      throw new Error(
        `Policy Error: Permission '${rule.requiredPermission}' denied for tool '${toolName}' (Danger Level: ${rule.dangerLevel}).`,
      );
    }
  }
}

export const defaultPolicyEngine = new PolicyEngine();
