import { DEFAULT_SYSTEM_PROMPT, getSystemPrompt } from "@prompts/system.js";
import { describe, expect, it } from "vitest";

describe("Prompts Module Suite", () => {
  it("should generate system prompt with defaults and custom context", () => {
    const defaultPrompt = getSystemPrompt();
    expect(defaultPrompt).toContain("Peer Coder");
    expect(DEFAULT_SYSTEM_PROMPT).toBeDefined();

    const customPrompt = getSystemPrompt({ agentName: "Custom Agent" });
    expect(customPrompt).toContain("Custom Agent");
  });
});
