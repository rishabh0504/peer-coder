import { WorkspaceLockManager } from "@workspace/context/workspace_lock.js";
import { describe, expect, it } from "vitest";

describe("WorkspaceLockManager Edge Cases", () => {
  it("should acquire lock on path successfully when unlocked", () => {
    const manager = new WorkspaceLockManager();
    expect(manager.acquireLock("file.txt")).toBe(true);
  });

  it("should report isLocked as true when path is locked", () => {
    const manager = new WorkspaceLockManager();
    manager.acquireLock("file.txt");
    expect(manager.isLocked("file.txt")).toBe(true);
  });

  it("should fail to acquire lock when path is already locked", () => {
    const manager = new WorkspaceLockManager();
    manager.acquireLock("file.txt");
    expect(manager.acquireLock("file.txt")).toBe(false);
  });

  it("should release path lock successfully", () => {
    const manager = new WorkspaceLockManager();
    manager.acquireLock("file.txt");
    manager.releaseLock("file.txt");
    expect(manager.isLocked("file.txt")).toBe(false);
  });

  it("should allow lock acquisition after path lock is released", () => {
    const manager = new WorkspaceLockManager();
    manager.acquireLock("file.txt");
    manager.releaseLock("file.txt");
    expect(manager.acquireLock("file.txt")).toBe(true);
  });

  it("should handle concurrent locks on distinct paths independently", () => {
    const manager = new WorkspaceLockManager();
    expect(manager.acquireLock("fileA.txt")).toBe(true);
    expect(manager.acquireLock("fileB.txt")).toBe(true);
    expect(manager.isLocked("fileA.txt")).toBe(true);
    expect(manager.isLocked("fileB.txt")).toBe(true);
  });
});
