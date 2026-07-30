import fs from "node:fs/promises";
import path from "node:path";
import type { WorkspaceContext } from "../../context/workspace_context.js";

export async function detectGit(
  context: WorkspaceContext,
): Promise<
  { isRepo: boolean; branch?: string; headCommit?: string; isDirty?: boolean } | undefined
> {
  const gitPath = path.resolve(context.workspaceRoot, ".git");

  try {
    const stat = await fs.stat(gitPath);
    if (!stat.isDirectory()) {
      return { isRepo: false };
    }
  } catch {
    return { isRepo: false };
  }

  // It is a git repo. Let's try to read branch name from .git/HEAD
  let branch = "unknown";
  let headCommit: string | undefined;

  try {
    const headFilePath = path.join(gitPath, "HEAD");
    const headContent = await fs.readFile(headFilePath, "utf8");
    const refMatch = headContent.match(/ref:\s*(refs\/heads\/\S+)/);

    if (refMatch) {
      const refPath = refMatch[1];
      if (refPath) {
        branch = refPath.replace("refs/heads/", "");

        // Try to read commit hash from .git/refs/heads/<branch>
        try {
          const commitHash = await fs.readFile(path.join(gitPath, refPath), "utf8");
          headCommit = commitHash.trim();
        } catch {
          // Maybe it's packed refs or ref is not written yet
        }
      }
    } else {
      // Detached HEAD
      headCommit = headContent.trim();
    }
  } catch {
    // Ignore read errors
  }

  return {
    isRepo: true,
    branch,
    headCommit,
    isDirty: false, // Defaulting to false or skip checking to prevent execution of external git CLI
  };
}
