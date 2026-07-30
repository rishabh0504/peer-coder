import { describe, expect, it } from "vitest";
import {
  AutoApprovalGate,
  createApprovalGate,
  requiresApproval,
} from "../../src/orchestration/approval_gate.js";

describe("ApprovalGate", () => {
  it("auto-approves by default", async () => {
    const prev = process.env.PEER_CODER_HITL;
    process.env.PEER_CODER_HITL = undefined;
    const gate = createApprovalGate();
    expect(gate).toBeInstanceOf(AutoApprovalGate);
    expect(await gate.approve({ toolName: "apply_patch", permission: "write" })).toBe(true);
    if (prev !== undefined) process.env.PEER_CODER_HITL = prev;
  });

  it("requires approval for write/execute tools", () => {
    expect(requiresApproval("apply_patch", "write")).toBe(true);
    expect(requiresApproval("read_file", "read")).toBe(false);
    expect(requiresApproval("run_command", "execute")).toBe(true);
  });
});
