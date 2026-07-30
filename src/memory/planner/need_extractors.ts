import type { MemoryNeed } from "../domain/types.js";

const PATH_RE = /(?:\.\/|\/)?[\w./-]+\.(?:ts|tsx|js|jsx|py|go|rs|md)/g;
const PASCAL_RE = /\b[A-Z][a-zA-Z0-9]{2,}\b/g;
const FAIL_RE = /\b(fail|failed|failure|error|why|broken|bug)\b/i;
const PREF_RE = /\b(prefer|always use|never use|hate|love using)\b/i;
const STACK_RE = /\b(pnpm|npm|yarn|postgres|supabase|prisma|next\.?js|react|typescript)\b/i;

export function extractNeeds(request: string): MemoryNeed[] {
  const needs: MemoryNeed[] = [{ kind: "execution" }, { kind: "task" }];
  const paths = request.match(PATH_RE) ?? [];
  for (const pathHint of paths) {
    needs.push({ kind: "file", pathHint });
  }

  const symbols = request.match(PASCAL_RE) ?? [];
  for (const name of symbols) {
    if (["The", "This", "What", "How", "Why", "Add", "Fix"].includes(name)) continue;
    needs.push({ kind: "symbol", name });
  }

  if (STACK_RE.test(request)) {
    needs.push({ kind: "repo_fact", subject: "project" });
  }

  if (PREF_RE.test(request)) {
    needs.push({ kind: "preference" });
  }

  if (FAIL_RE.test(request)) {
    needs.push({ kind: "experience", episodeTypes: ["failure"] });
  }

  if (needs.length <= 2) {
    needs.push({ kind: "unknown" });
  }

  return needs;
}
