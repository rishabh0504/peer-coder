import type { LanguageParser } from "../types.js";

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".pyi": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".rb": "ruby",
  ".php": "php",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".swift": "swift",
  ".cs": "csharp",
  ".scala": "scala",
  ".vue": "vue",
  ".svelte": "javascript",
  ".zig": "zig",
  ".lua": "lua",
  ".ex": "elixir",
  ".exs": "elixir",
};

/** Extensions we attempt to index (known language or generic text). */
export const INDEXABLE_EXTENSIONS = new Set([
  ...Object.keys(EXTENSION_TO_LANGUAGE),
  ".txt",
  ".md",
  ".toml",
  ".yaml",
  ".yml",
  ".json",
]);

export function languageFromExtension(ext: string): string {
  const lower = ext.toLowerCase();
  return EXTENSION_TO_LANGUAGE[lower] ?? "generic";
}

export class LanguageRegistry {
  private readonly byLanguage = new Map<string, LanguageParser>();
  private generic: LanguageParser | null = null;

  register(parser: LanguageParser): void {
    this.byLanguage.set(parser.languageId, parser);
    for (const ext of parser.extensions) {
      // extensions documented on parser; map already has language ids
      void ext;
    }
  }

  setGeneric(parser: LanguageParser): void {
    this.generic = parser;
  }

  resolve(extOrLanguage: string): LanguageParser | null {
    const asLang = extOrLanguage.startsWith(".")
      ? languageFromExtension(extOrLanguage)
      : extOrLanguage;

    if (asLang === "typescript" || asLang === "tsx" || asLang === "javascript") {
      return (
        this.byLanguage.get(asLang) ??
        this.byLanguage.get("typescript") ??
        this.byLanguage.get("javascript") ??
        this.generic
      );
    }
    if (asLang === "c" || asLang === "cpp") {
      return this.byLanguage.get(asLang) ?? this.byLanguage.get("cpp") ?? this.generic;
    }
    return this.byLanguage.get(asLang) ?? this.generic;
  }

  list(): LanguageParser[] {
    return [...this.byLanguage.values()];
  }
}
