import fs from "node:fs/promises";
import path from "node:path";
import { createDefaultWorkspaceContext } from "@workspace/workspace_context.js";
import { validateFileReadSafety, validatePath } from "@workspace/workspace_guard.js";
import { describe, expect, it } from "vitest";

describe("WorkspaceGuard Exhaustive Branch Coverage", () => {
  const context = createDefaultWorkspaceContext(process.cwd());
  context.configuration.maxFileSizeByte = 100; // 100 bytes limit for testing

  it("should throw error if target path is empty or non-string", () => {
    expect(() => validatePath(context, "" as any)).toThrow(
      "Target path must be a non-empty string.",
    );
  });

  it("should throw error if path is outside workspace root", () => {
    expect(() => validatePath(context, "../../../etc/passwd")).toThrow(/Security Error/);
  });

  it("should throw error if validating directory as file read", async () => {
    await expect(validateFileReadSafety(context, process.cwd())).rejects.toThrow(
      "is a directory, not a file.",
    );
  });

  it("should throw error if file exceeds max size limit", async () => {
    const testFile = path.join(process.cwd(), "temp_large_file.txt");
    await fs.writeFile(testFile, "a".repeat(200));

    try {
      await expect(validateFileReadSafety(context, testFile)).rejects.toThrow(
        /exceeds maximum allowed limit/,
      );
    } finally {
      await fs.unlink(testFile);
    }
  });

  it("should throw error if file contains binary zero bytes", async () => {
    const testBinaryFile = path.join(process.cwd(), "temp_binary_file.bin");
    const buf = Buffer.from([0x61, 0x00, 0x62]);
    await fs.writeFile(testBinaryFile, buf);

    try {
      await expect(validateFileReadSafety(context, testBinaryFile)).rejects.toThrow(
        "appears to be a binary file.",
      );
    } finally {
      await fs.unlink(testBinaryFile);
    }
  });

  it("should handle non-Error throw gracefully in validateFileReadSafety catch block", async () => {
    await expect(
      validateFileReadSafety(context, "non_existent_file_path_12345.xyz"),
    ).rejects.toThrow();
  });
});
