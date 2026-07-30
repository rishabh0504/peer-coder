/**
 * Approval gate for WRITE/EXECUTE tools.
 * Default: auto-approve. Set PEER_CODER_HITL=1 for interactive confirm.
 */
import { confirm } from "@clack/prompts";

export type ApprovalAction = {
  toolName: string;
  permission: string;
  args?: unknown;
};

export interface ApprovalGate {
  approve(action: ApprovalAction): Promise<boolean>;
}

export class AutoApprovalGate implements ApprovalGate {
  async approve(): Promise<boolean> {
    return true;
  }
}

export class PromptApprovalGate implements ApprovalGate {
  async approve(action: ApprovalAction): Promise<boolean> {
    const result = await confirm({
      message: `Allow ${action.permission.toUpperCase()} tool "${action.toolName}"?`,
      initialValue: false,
    });
    return result === true;
  }
}

export function createApprovalGate(): ApprovalGate {
  if (process.env.PEER_CODER_HITL === "1") return new PromptApprovalGate();
  return new AutoApprovalGate();
}

const WRITEISH = /create|patch|delete|write|execute|run/;

export function requiresApproval(toolName: string, permission: string): boolean {
  if (permission === "write" || permission === "execute") return true;
  return WRITEISH.test(toolName);
}
