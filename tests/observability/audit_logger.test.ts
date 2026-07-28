import { AuditLogger } from "@observability/audit_logger.js";
import { DangerLevel } from "@security/policy_engine.js";
import { describe, expect, it } from "vitest";

describe("AuditLogger Edge Cases", () => {
  it("should record successful tool executions with timing", () => {
    const logger = new AuditLogger();
    logger.log({
      sessionId: "session_123",
      toolName: "read_file",
      args: { path: "src/index.ts" },
      durationMs: 15,
      success: true,
      dangerLevel: DangerLevel.LOW,
    });

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.toolName).toBe("read_file");
    expect(logs[0]?.success).toBe(true);
    expect(logs[0]?.timestamp).toBeDefined();
  });

  it("should record failed executions with error messages", () => {
    const logger = new AuditLogger();
    logger.log({
      sessionId: "session_123",
      toolName: "delete_file",
      args: { path: "missing.txt" },
      durationMs: 5,
      success: false,
      dangerLevel: DangerLevel.HIGH,
      error: "ENOENT: file not found",
    });

    const logs = logger.getLogs();
    expect(logs[0]?.success).toBe(false);
    expect(logs[0]?.error).toBe("ENOENT: file not found");
  });

  it("should clear audit logs when clear() is invoked", () => {
    const logger = new AuditLogger();
    logger.log({
      sessionId: "session_123",
      toolName: "read_file",
      args: {},
      durationMs: 1,
      success: true,
      dangerLevel: DangerLevel.LOW,
    });
    expect(logger.getLogs()).toHaveLength(1);
    logger.clear();
    expect(logger.getLogs()).toHaveLength(0);
  });
});
