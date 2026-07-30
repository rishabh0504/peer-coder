import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { INDEXABLE_EXTENSIONS } from "../languages/registry.js";
import { DEFAULT_MAX_FILES, DEFAULT_MAX_FILE_BYTES } from "../types.js";

export interface WalkedFile {
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  contentHash: string;
  content: string;
  extension: string;
}

export interface WalkOptions {
  workspacePath: string;
  maxFiles?: number;
  maxFileBytes?: number;
  signal?: AbortSignal;
}

export interface WalkResult {
  files: WalkedFile[];
  filesSeen: number;
  filesSkipped: number;
  skipReasons: Record<string, number>;
}

const HARD_SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
  "vendor",
  "target",
  "__pycache__",
  ".next",
  ".venv",
  "venv",
  ".peer-coder",
]);

function looksBinary(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 8000));
  if (sample.includes(0)) return true;
  let weird = 0;
  for (const b of sample) {
    if (b < 7 || (b > 13 && b < 32)) weird++;
  }
  return weird / sample.length > 0.3;
}

async function loadGitignore(root: string): Promise<ignore.Ignore> {
  const ig = ignore();
  ig.add([
    "node_modules/",
    "dist/",
    "build/",
    ".git/",
    "coverage/",
    "vendor/",
    "target/",
    "__pycache__/",
    "*.min.js",
    "*.map",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
  ]);
  try {
    const raw = await readFile(path.join(root, ".gitignore"), "utf8");
    ig.add(raw);
  } catch {
    // no .gitignore
  }
  return ig;
}

/**
 * .gitignore-aware polyglot source walk with size/binary caps.
 */
export async function walkRepo(options: WalkOptions): Promise<WalkResult> {
  const root = path.resolve(options.workspacePath);
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const ig = await loadGitignore(root);

  const files: WalkedFile[] = [];
  let filesSeen = 0;
  let filesSkipped = 0;
  const skipReasons: Record<string, number> = {};

  const bump = (reason: string) => {
    filesSkipped++;
    skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
  };

  async function walk(dir: string): Promise<void> {
    if (files.length >= maxFiles) return;
    if (options.signal?.aborted) return;

    let entries: Dirent[] = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      bump("readdir");
      return;
    }

    for (const ent of entries) {
      if (files.length >= maxFiles) return;
      if (options.signal?.aborted) return;
      if (HARD_SKIP_DIRS.has(ent.name)) continue;

      const absolutePath = path.join(dir, ent.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");

      if (ig.ignores(relativePath) || ig.ignores(relativePath + (ent.isDirectory() ? "/" : ""))) {
        bump("gitignore");
        continue;
      }

      if (ent.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!ent.isFile()) continue;
      filesSeen++;

      const ext = path.extname(ent.name).toLowerCase();
      if (!INDEXABLE_EXTENSIONS.has(ext)) {
        bump("extension");
        continue;
      }

      let st: Awaited<ReturnType<typeof stat>>;
      try {
        st = await stat(absolutePath);
      } catch {
        bump("stat");
        continue;
      }

      if (st.size > maxFileBytes) {
        bump("size");
        continue;
      }

      let buf: Buffer;
      try {
        buf = await readFile(absolutePath);
      } catch {
        bump("read");
        continue;
      }

      if (looksBinary(buf)) {
        bump("binary");
        continue;
      }

      const content = buf.toString("utf8");
      const contentHash = createHash("sha1").update(content).digest("hex");

      files.push({
        absolutePath,
        relativePath,
        sizeBytes: st.size,
        contentHash,
        content,
        extension: ext || ".txt",
      });
    }
  }

  await walk(root);
  return { files, filesSeen, filesSkipped, skipReasons };
}
