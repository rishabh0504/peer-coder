import { DangerLevel, PolicyEngine } from "@security/policy_engine.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { describe, expect, it } from "vitest";

describe("PolicyEngine Edge Cases", () => {
  const engine = new PolicyEngine();

  it("should assign LOW danger level to read_file", () => {
    const rule = engine.getRule("read_file");
    expect(rule.dangerLevel).toBe(DangerLevel.LOW);
    expect(rule.requiredPermission).toBe("read");
  });

  it("should assign LOW danger level to list_files", () => {
    const rule = engine.getRule("list_files");
    expect(rule.dangerLevel).toBe(DangerLevel.LOW);
    expect(rule.requiredPermission).toBe("read");
  });

  it("should assign MEDIUM danger level to create_file", () => {
    const rule = engine.getRule("create_file");
    expect(rule.dangerLevel).toBe(DangerLevel.MEDIUM);
    expect(rule.requiredPermission).toBe("write");
  });

  it("should assign MEDIUM danger level to apply_patch", () => {
    const rule = engine.getRule("apply_patch");
    expect(rule.dangerLevel).toBe(DangerLevel.MEDIUM);
    expect(rule.requiredPermission).toBe("write");
  });

  it("should assign HIGH danger level to delete_file", () => {
    const rule = engine.getRule("delete_file");
    expect(rule.dangerLevel).toBe(DangerLevel.HIGH);
    expect(rule.requiredPermission).toBe("delete");
  });

  it("should assign CRITICAL danger level to execute_command", () => {
    const rule = engine.getRule("execute_command");
    expect(rule.dangerLevel).toBe(DangerLevel.CRITICAL);
    expect(rule.requiredPermission).toBe("execute");
  });

  it("should enforce read permission for read_file", () => {
    const context = createDefaultWorkspaceContext();
    context.permissions.read = false;
    expect(() => engine.validatePolicy(context.permissions, "read_file")).toThrow(
      /Policy Error: Permission 'read' denied/,
    );
  });

  it("should enforce write permission for create_file", () => {
    const context = createDefaultWorkspaceContext();
    context.permissions.write = false;
    expect(() => engine.validatePolicy(context.permissions, "create_file")).toThrow(
      /Policy Error: Permission 'write' denied/,
    );
  });

  it("should enforce write permission for apply_patch", () => {
    const context = createDefaultWorkspaceContext();
    context.permissions.write = false;
    expect(() => engine.validatePolicy(context.permissions, "apply_patch")).toThrow(
      /Policy Error: Permission 'write' denied/,
    );
  });

  it("should enforce delete permission for delete_file", () => {
    const context = createDefaultWorkspaceContext();
    context.permissions.delete = false;
    expect(() => engine.validatePolicy(context.permissions, "delete_file")).toThrow(
      /Policy Error: Permission 'delete' denied/,
    );
  });

  it("should enforce execute permission for execute_command", () => {
    const context = createDefaultWorkspaceContext();
    context.permissions.execute = false;
    expect(() => engine.validatePolicy(context.permissions, "execute_command")).toThrow(
      /Policy Error: Permission 'execute' denied/,
    );
  });

  it("should assign default MEDIUM/write policy for unknown tools", () => {
    const rule = engine.getRule("unknown_custom_tool");
    expect(rule.dangerLevel).toBe(DangerLevel.MEDIUM);
    expect(rule.requiredPermission).toBe("write");
  });
});
