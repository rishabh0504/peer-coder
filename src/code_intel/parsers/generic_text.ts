import type { IndexedSymbol, LanguageParser, ParseResult } from "../types.js";

const IDENT = /\b([A-Za-z_][A-Za-z0-9_]{2,})\b/g;

/**
 * Generic text extractor for unsupported languages / WASM degradation.
 * confidence=low — never claim AST accuracy.
 */
export function createGenericTextParser(): LanguageParser {
  return {
    languageId: "generic",
    extensions: [],
    async parse(filePath, content): Promise<ParseResult> {
      const symbols: IndexedSymbol[] = [];
      const seen = new Set<string>();
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        // Prefer definition-ish lines
        const defish =
          /\b(class|struct|enum|interface|trait|fn|func|def|function|type|impl)\s+([A-Za-z_][\w]*)/.exec(
            line,
          );
        if (defish?.[2]) {
          const name = defish[2];
          const key = `${name}@${i + 1}`;
          if (!seen.has(key)) {
            seen.add(key);
            symbols.push({
              name,
              kind: defish[1] ?? "symbol",
              filePath,
              startLine: i + 1,
              endLine: i + 1,
              exported: false,
              signature: line.trim().slice(0, 120),
              language: "generic",
              confidence: "low",
              parser: "generic",
            });
          }
          continue;
        }

        IDENT.lastIndex = 0;
        let m = IDENT.exec(line);
        let count = 0;
        while (m && count < 3) {
          const name = m[1];
          if (!name || name.length < 3) {
            m = IDENT.exec(line);
            continue;
          }
          // skip common keywords
          if (
            /^(the|and|for|var|let|const|return|import|from|this|self|null|true|false)$/i.test(name)
          ) {
            m = IDENT.exec(line);
            continue;
          }
          const key = `${name}@${i + 1}`;
          if (!seen.has(key) && /^[A-Z]/.test(name)) {
            seen.add(key);
            symbols.push({
              name,
              kind: "identifier",
              filePath,
              startLine: i + 1,
              endLine: i + 1,
              exported: false,
              language: "generic",
              confidence: "low",
              parser: "generic",
            });
            count++;
          }
          m = IDENT.exec(line);
        }
      }

      return { symbols: symbols.slice(0, 200), edges: [], degradation: "none" };
    },
  };
}
