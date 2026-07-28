import fs from "node:fs/promises";
import path from "node:path";
import type { WorkspaceContext } from "@workspace/workspace_context.js";
import { validateFileReadSafety, validatePath } from "@workspace/workspace_guard.js";

export interface ReadFileResult {
  path: string;
  content: string;
  totalLines: number;
  startLine: number;
  endLine: number;
  truncated: boolean;
}

export interface ListFilesOptions {
  path?: string;
  recursive?: boolean;
  maxDepth?: number;
  maxResults?: number;
  extensions?: string[];
  ignore?: string[];
}

export class WorkspaceFileSystem {
  public async readFile(
    context: WorkspaceContext,
    targetPath: string,
    startLine?: number,
    endLine?: number,
    includeLineNumbers = true,
  ): Promise<ReadFileResult> {
    const resolvedPath = validatePath(context, targetPath);
    await validateFileReadSafety(context, resolvedPath);

    let stats: import("node:fs").Stats;
    try {
      stats = await fs.stat(resolvedPath);
    } catch {
      const errorMsg = `File does not exist or is not readable: ${targetPath}`;
      throw new Error(errorMsg);
    }

    if (stats.isDirectory()) {
      throw new Error(`Path '${targetPath}' is a directory, not a file.`);
    }

    let rawContent: string;
    try {
      rawContent = await fs.readFile(resolvedPath, "utf-8");
    } catch (err) {
      throw new Error(`Failed to read file: ${(err as Error).message}`);
    }

    const lines = rawContent.split(/\r?\n/);
    const totalLines = Math.max(1, lines.length);

    const parsedStart = startLine ?? 1;
    const parsedEnd = endLine ?? totalLines;

    // Handle out of bound and reverse ranges gracefully by clamping
    let actualStart = Math.min(totalLines, Math.max(1, parsedStart));
    let actualEnd = Math.min(totalLines, Math.max(1, parsedEnd));

    if (actualStart > actualEnd) {
      const temp = actualStart;
      actualStart = actualEnd;
      actualEnd = temp;
    }

    const selectedLines = lines.slice(actualStart - 1, actualEnd);
    const formattedContent = includeLineNumbers
      ? selectedLines.map((line, idx) => `${actualStart + idx} | ${line}`).join("\n")
      : selectedLines.join("\n");

    return {
      path: resolvedPath,
      content: formattedContent,
      totalLines,
      startLine: actualStart,
      endLine: actualEnd,
      truncated: actualStart > 1 || actualEnd < totalLines,
    };
  }

  public async createFile(
    context: WorkspaceContext,
    targetPath: string,
    content: string,
    overwrite = false,
  ): Promise<{ path: string; bytesWritten: number }> {
    const resolvedPath = validatePath(context, targetPath);

    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.isFile() && !overwrite) {
        throw new Error(
          `File '${targetPath}' already exists. Set 'overwrite: true' to overwrite existing files.`,
        );
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content, "utf-8");

    return {
      path: resolvedPath,
      bytesWritten: Buffer.byteLength(content, "utf-8"),
    };
  }

  public async applyPatch(
    context: WorkspaceContext,
    targetPath: string,
    startLine: number,
    endLine: number,
    replacement: string,
  ): Promise<{ path: string; linesReplaced: number }> {
    const resolvedPath = validatePath(context, targetPath);
    await validateFileReadSafety(context, resolvedPath);

    const rawContent = await fs.readFile(resolvedPath, "utf-8");
    const lines = rawContent.split(/\r?\n/);
    const totalLines = lines.length;

    if (startLine < 1 || startLine > totalLines) {
      throw new Error(`Invalid startLine ${startLine} for file with ${totalLines} lines.`);
    }
    if (endLine < startLine || endLine > totalLines) {
      throw new Error(`Invalid endLine ${endLine} for file with ${totalLines} lines.`);
    }

    const replacementLines = replacement.split(/\r?\n/);
    const linesBefore = lines.slice(0, startLine - 1);
    const linesAfter = lines.slice(endLine);

    const updatedLines = [...linesBefore, ...replacementLines, ...linesAfter];
    await fs.writeFile(resolvedPath, updatedLines.join("\n"), "utf-8");

    return {
      path: resolvedPath,
      linesReplaced: endLine - startLine + 1,
    };
  }

  public async deleteFile(
    context: WorkspaceContext,
    targetPath: string,
  ): Promise<{ path: string; deleted: boolean }> {
    const resolvedPath = validatePath(context, targetPath);
    await fs.unlink(resolvedPath);
    return { path: resolvedPath, deleted: true };
  }

  public async listFiles(
    context: WorkspaceContext,
    options: ListFilesOptions = {},
  ): Promise<{ path: string; files: string[]; total: number }> {
    const targetPath = options.path || ".";
    const resolvedPath = validatePath(context, targetPath);

    const recursive = options.recursive ?? false;
    const maxDepth = options.maxDepth ?? 5;
    const maxResults = options.maxResults ?? 500;
    const extensions = options.extensions?.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));

    const results: string[] = [];

    const walk = async (currentDir: string, currentDepth: number) => {
      if (results.length >= maxResults || currentDepth > maxDepth) return;

      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(context.workspaceRoot, fullPath);

        if (entry.isDirectory() && recursive) {
          await walk(fullPath, currentDepth + 1);
        } else if (entry.isFile()) {
          if (extensions && extensions.length > 0) {
            const ext = path.extname(entry.name);
            if (!extensions.includes(ext)) continue;
          }
          results.push(relativePath);
        }
      }
    };

    const stats = await fs.stat(resolvedPath);
    if (stats.isDirectory()) {
      await walk(resolvedPath, 1);
    } else {
      results.push(path.relative(context.workspaceRoot, resolvedPath));
    }

    return {
      path: resolvedPath,
      files: results,
      total: results.length,
    };
  }
}

export const workspaceFileSystem = new WorkspaceFileSystem();
