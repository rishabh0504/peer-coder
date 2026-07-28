import fs from "node:fs/promises";
import path from "node:path";
import type { WorkspaceContext } from "./workspace_context.js";

/**
 * Resolves targetPath relative to context.workspaceRoot and verifies path traversal security boundaries.
 */
export function validatePath(context: WorkspaceContext, targetPath: string): string {
  if (!targetPath || typeof targetPath !== "string") {
    throw new Error("Target path must be a non-empty string.");
  }

  const absoluteRoot = path.resolve(context.workspaceRoot);
  const resolvedPath = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(absoluteRoot, targetPath);

  // Verify path boundary traversal (jail escape protection)
  const relative = path.relative(absoluteRoot, resolvedPath);
  const isOutside = relative.startsWith("..") || path.isAbsolute(relative);

  if (isOutside) {
    throw new Error(
      `Security Error: Access denied to path '${targetPath}' outside workspace root '${absoluteRoot}'.`,
    );
  }

  return resolvedPath;
}

/**
 * Checks file size and binary content safety prior to reading.
 */
export async function validateFileReadSafety(
  context: WorkspaceContext,
  filePath: string,
): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      throw new Error(`Path '${filePath}' is a directory, not a file.`);
    }

    if (stats.size > context.configuration.maxFileSizeByte) {
      throw new Error(
        `File size (${(stats.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit (${(context.configuration.maxFileSizeByte / (1024 * 1024)).toFixed(2)} MB).`,
      );
    }

    // Check binary content
    const handle = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(Math.min(stats.size, context.configuration.binaryCheckLimitByte));
    await handle.read(buffer, 0, buffer.length, 0);
    await handle.close();

    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0) {
        throw new Error(`File '${filePath}' appears to be a binary file.`);
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`File does not exist or is not readable: ${filePath}`);
      }
      throw err;
    }
    throw new Error(String(err));
  }
}
