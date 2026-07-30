import type { WorkflowId } from "./schema.js";

const ANALYZE =
  /\b(analyze|analyse|tech stack|what stack|detect framework|workspace profile|repository analysis)\b/i;
const STATUS = /\b(what'?s left|progress|status|current task|where are we)\b/i;
const RESEARCH_ONLY =
  /\b(look up|docs for|documentation for|how (does|do) .+ work|what is the api|changelog|migration guide)\b/i;
const LOCAL_ONLY = /\b(rename|typo|fix typo|indent|whitespace)\b/i;
const CODING = /\b(add|implement|fix|build|refactor|create|write|change|update|feature)\b/i;

export function classifyWorkflow(userRequest: string): WorkflowId {
  const q = userRequest.trim();
  if (ANALYZE.test(q)) return "workspace_analyze";
  if (STATUS.test(q)) return "status_query";
  if (RESEARCH_ONLY.test(q) && !CODING.test(q)) return "research_only";
  if (LOCAL_ONLY.test(q)) return "coding_change";
  if (CODING.test(q)) return "coding_change";
  return "coding_change";
}

export function shouldRunResearch(opts: {
  userRequest: string;
  codeIntelWeak: boolean;
  researchRequiredFlag?: boolean;
  needResearchError?: boolean;
}): boolean {
  if (opts.researchRequiredFlag || opts.needResearchError) return true;
  if (LOCAL_ONLY.test(opts.userRequest) && !RESEARCH_ONLY.test(opts.userRequest)) return false;
  if (RESEARCH_ONLY.test(opts.userRequest)) return true;
  if (/\b(docs|documentation|api|library|sdk|package)\b/i.test(opts.userRequest)) return true;
  if (
    opts.codeIntelWeak &&
    /\b[A-Z][a-zA-Z0-9]+|[a-z]+@[0-9]|npm|pip|crate\b/.test(opts.userRequest)
  ) {
    return true;
  }
  return false;
}

export function looksLikeKnowledgeGap(failures: Array<{ message: string }>): boolean {
  return failures.some((f) =>
    /cannot find module|is not defined|unknown type|no exported member|ModuleNotFound|ImportError|unresolved import/i.test(
      f.message,
    ),
  );
}
