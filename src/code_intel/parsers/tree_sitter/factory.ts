import type { Node, Tree } from "web-tree-sitter";
import type { IndexedEdge, IndexedSymbol, ParseResult, ParserBackend } from "../../types.js";
import type { LanguageParser } from "../../types.js";
import { createParserForGrammar } from "./runtime.js";

export interface NodeKindMap {
  /** tree-sitter node type → symbol kind */
  defs: Record<string, string>;
  nameFields?: string[];
  importTypes?: string[];
}

function nodeText(node: Node): string {
  return node.text;
}

function findName(node: Node, fields: string[]): string | null {
  for (const f of fields) {
    const child = node.childForFieldName(f);
    if (child) return child.text;
  }
  // fallback: first identifier-like child
  for (let i = 0; i < node.namedChildCount; i++) {
    const c = node.namedChild(i);
    if (!c) continue;
    if (
      c.type === "identifier" ||
      c.type === "type_identifier" ||
      c.type === "property_identifier" ||
      c.type === "name" ||
      c.type.includes("identifier")
    ) {
      return c.text;
    }
  }
  return null;
}

function walk(
  node: Node,
  filePath: string,
  language: string,
  map: NodeKindMap,
  symbols: IndexedSymbol[],
  edges: IndexedEdge[],
  backend: ParserBackend,
): void {
  const kind = map.defs[node.type];
  if (kind) {
    const name = findName(node, map.nameFields ?? ["name"]);
    if (name) {
      symbols.push({
        name,
        kind,
        filePath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        exported: /export|pub |public /.test(nodeText(node).slice(0, 40)),
        signature: nodeText(node).slice(0, 120).replace(/\s+/g, " ").trim(),
        language,
        confidence: "high",
        parser: backend,
      });
    }
  }

  if (map.importTypes?.includes(node.type)) {
    const text = nodeText(node);
    const m =
      text.match(/from\s+['"]([^'"]+)['"]/) ||
      text.match(/import\s+['"]([^'"]+)['"]/) ||
      text.match(/use\s+([\w:]+)/) ||
      text.match(/#include\s*[<"]([^>"]+)[>"]/);
    if (m?.[1]) {
      edges.push({
        from: filePath,
        to: m[1],
        relation: "imports",
        filePath,
        language,
        confidence: "medium",
      });
    }
  }

  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (child) walk(child, filePath, language, map, symbols, edges, backend);
  }
}

export function createTreeSitterParser(opts: {
  languageId: string;
  extensions: string[];
  grammarFile: string;
  map: NodeKindMap;
}): LanguageParser {
  let parserPromise: Promise<Awaited<ReturnType<typeof createParserForGrammar>>> | null = null;

  const getParser = () => {
    if (!parserPromise) {
      parserPromise = createParserForGrammar(opts.grammarFile).catch((err) => {
        parserPromise = null;
        throw err;
      });
    }
    return parserPromise;
  };

  return {
    languageId: opts.languageId,
    extensions: opts.extensions,
    async parse(filePath, content): Promise<ParseResult> {
      try {
        const parser = await getParser();
        const tree: Tree | null = parser.parse(content);
        if (!tree) {
          return { symbols: [], edges: [], degradation: "parser-error" };
        }
        const symbols: IndexedSymbol[] = [];
        const edges: IndexedEdge[] = [];
        walk(tree.rootNode, filePath, opts.languageId, opts.map, symbols, edges, "tree-sitter");
        tree.delete();
        return { symbols, edges, degradation: "none" };
      } catch {
        return { symbols: [], edges: [], degradation: "no-wasm" };
      }
    },
  };
}
