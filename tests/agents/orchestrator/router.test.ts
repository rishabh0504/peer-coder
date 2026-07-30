import { describe, expect, it } from "vitest";
import {
  classifyWorkflow,
  looksLikeKnowledgeGap,
  shouldRunResearch,
} from "../../../src/agents/orchestrator/router.js";

describe("orchestrator router", () => {
  it("classifies analyze / status / research / coding", () => {
    expect(classifyWorkflow("analyze the workspace stack")).toBe("workspace_analyze");
    expect(classifyWorkflow("what's left on the current task")).toBe("status_query");
    expect(classifyWorkflow("docs for zod coerce API")).toBe("research_only");
    expect(classifyWorkflow("add OAuth login feature")).toBe("coding_change");
  });

  it("research gate skips local edits", () => {
    expect(
      shouldRunResearch({
        userRequest: "fix typo in readme",
        codeIntelWeak: true,
      }),
    ).toBe(false);
  });

  it("research gate fires for API docs intent", () => {
    expect(
      shouldRunResearch({
        userRequest: "how do I use the stripe API",
        codeIntelWeak: false,
      }),
    ).toBe(true);
  });

  it("detects knowledge-gap verify failures", () => {
    expect(looksLikeKnowledgeGap([{ message: "Cannot find module 'foo'" }])).toBe(true);
    expect(looksLikeKnowledgeGap([{ message: "Assertion failed" }])).toBe(false);
  });
});
