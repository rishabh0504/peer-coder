import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Language, Parser } from "web-tree-sitter";

const require = createRequire(import.meta.url);

let initPromise: Promise<void> | null = null;
const languageCache = new Map<string, Language>();

function resolveWasmPath(packageName: string, relative: string): string {
  const pkgJson = require.resolve(`${packageName}/package.json`);
  return path.join(path.dirname(pkgJson), relative);
}

/**
 * Lazy-init web-tree-sitter + load language WASM from tree-sitter-wasms.
 * Degrades cleanly: callers catch and fall back to generic parsers.
 */
export async function ensureTreeSitterRuntime(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const wasmPath = resolveWasmPath("web-tree-sitter", "web-tree-sitter.wasm");
      await Parser.init({
        locateFile: () => wasmPath,
      } as never);
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

export async function loadLanguageWasm(grammarFile: string): Promise<Language> {
  await ensureTreeSitterRuntime();
  const cached = languageCache.get(grammarFile);
  if (cached) return cached;

  const wasmPath = resolveWasmPath("tree-sitter-wasms", path.join("out", grammarFile));
  // Language.load accepts filesystem path string on Node
  const lang = await Language.load(wasmPath);
  languageCache.set(grammarFile, lang);
  return lang;
}

export async function createParserForGrammar(grammarFile: string): Promise<Parser> {
  await ensureTreeSitterRuntime();
  const language = await loadLanguageWasm(grammarFile);
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}

export { Parser, Language, pathToFileURL };
