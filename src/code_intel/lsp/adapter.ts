/** LSP seam — no required language server in this phase. */

import type { LanguageServerAdapter, ReferenceMatch, SymbolMatch } from "../types.js";

export class NoopLanguageServerAdapter implements LanguageServerAdapter {
  async definitions(
    _workspacePath: string,
    _filePath: string,
    _line: number,
    _character: number,
  ): Promise<SymbolMatch[]> {
    return [];
  }
  async references(
    _workspacePath: string,
    _filePath: string,
    _line: number,
    _character: number,
  ): Promise<ReferenceMatch[]> {
    return [];
  }
  async hover(
    _workspacePath: string,
    _filePath: string,
    _line: number,
    _character: number,
  ): Promise<string | null> {
    return null;
  }
}

export type { LanguageServerAdapter };
