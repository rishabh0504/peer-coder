import { describe, expect, it } from "vitest";
import { createMemoryManager } from "../../src/memory/memory_manager.js";
import { expiresAt, shouldPromote } from "../../src/memory/storage/promotion_policy.js";
import { isSupabaseConfigured } from "../../src/memory/storage/supabase_sync.js";

describe("Stage 2 memory", () => {
  it("seeds L2 facts offline and recalls them", async () => {
    const mm = createMemoryManager();
    await mm.seedRepositoryProfile("/tmp/ws", {
      projectName: "demo",
      packageManager: "pnpm",
      languages: ["typescript"],
    });
    const pack = await mm.planAndRecall("what stack?", {
      workspaceId: "/tmp/ws",
      executionId: "e1",
    });
    expect(mm.l2.current("/tmp/ws").some((f) => f.predicate === "packageManager")).toBe(true);
    expect(pack.systemMemory.repository.packageManager).toBe("pnpm");
  });

  it("promotion policy gates by kind/confidence", () => {
    expect(shouldPromote("preference", 0)).toBe(true);
    expect(shouldPromote("repo_fact", 0.5)).toBe(false);
    expect(shouldPromote("repo_fact", 0.7)).toBe(true);
    expect(expiresAt("preference")).toBeUndefined();
    expect(expiresAt("repo_fact")).toMatch(/T/);
  });

  it("reports supabase unset without throwing", () => {
    expect(typeof isSupabaseConfigured()).toBe("boolean");
  });
});
