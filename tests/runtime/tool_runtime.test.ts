import { ToolRuntime } from "@runtime/tool_runtime.js";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { defaultWorkspaceLockManager } from "@workspace/workspace_lock.js";
import { describe, expect, it } from "vitest";

describe("ToolRuntime Pipeline Edge Cases", () => {
  it("should execute tool pipeline successfully and return ToolResponse success: true", async () => {
    const runtime = new ToolRuntime();
    const context = createDefaultWorkspaceContext();

    const response = await runtime.execute(
      "read_file",
      { path: "test.txt" },
      async () => ({ content: "hello" }),
      context,
    );

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ content: "hello" });
    expect(response.metadata?.durationMs).toBeDefined();
  });

  it("should return ToolResponse success: false with code POLICY_ERROR on permission denial", async () => {
    const runtime = new ToolRuntime();
    const context = createDefaultWorkspaceContext();
    context.permissions.read = false;

    const response = await runtime.execute(
      "read_file",
      { path: "test.txt" },
      async () => ({ content: "hello" }),
      context,
    );

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe("POLICY_ERROR");
    expect(response.error?.message).toContain("Permission 'read' denied");
  });

  it("should return ToolResponse success: false with code LOCK_ERROR when path is locked", async () => {
    const runtime = new ToolRuntime();
    const context = createDefaultWorkspaceContext();

    defaultWorkspaceLockManager.acquireLock("locked.txt");

    try {
      const response = await runtime.execute(
        "read_file",
        { path: "locked.txt" },
        async () => ({ content: "hello" }),
        context,
      );

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe("LOCK_ERROR");
      expect(response.error?.message).toContain("currently locked");
    } finally {
      defaultWorkspaceLockManager.releaseLock("locked.txt");
    }
  });

  it("should return ToolResponse success: false with code EXECUTION_ERROR when tool handler throws", async () => {
    const runtime = new ToolRuntime();
    const context = createDefaultWorkspaceContext();

    const response = await runtime.execute(
      "create_file",
      { path: "error.txt" },
      async () => {
        throw new Error("Disk quota exceeded");
      },
      context,
    );

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe("EXECUTION_ERROR");
    expect(response.error?.message).toBe("Disk quota exceeded");
  });

  it("should release path lock in finally block even when tool handler throws an exception", async () => {
    const runtime = new ToolRuntime();
    const context = createDefaultWorkspaceContext();

    await runtime.execute(
      "create_file",
      { path: "exception_file.txt" },
      async () => {
        throw new Error("Unexpected failure");
      },
      context,
    );

    expect(defaultWorkspaceLockManager.isLocked("exception_file.txt")).toBe(false);
  });
});
