export interface ParsedToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

interface FallbackJSON {
  tool?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  filePath?: string;
  path?: string;
  startLine?: number;
  endLine?: number;
}

export function parseToolCall(
  nativeToolCalls?: Array<{ id?: string; name: string; args?: Record<string, unknown> }>,
  textOutput?: string,
): ParsedToolCall | null {
  // 1. Prefer native tool calls
  if (nativeToolCalls && nativeToolCalls.length > 0 && nativeToolCalls[0]) {
    const firstCall = nativeToolCalls[0];
    return {
      id: firstCall.id || `call_${Date.now()}`,
      name: firstCall.name,
      args: firstCall.args || {},
    };
  }

  // 2. Fallback text JSON tool call parser
  if (textOutput) {
    try {
      const jsonMatch =
        textOutput.match(/```json\s*([\s\S]*?)\s*```/) ||
        textOutput.match(/(\{[\s\S]*"(tool|name)"[\s\S]*\})/);

      if (jsonMatch?.[1]) {
        const parsed = JSON.parse(jsonMatch[1].trim()) as FallbackJSON;
        if (parsed && typeof parsed === "object" && (parsed.tool || parsed.name)) {
          const name = parsed.tool || parsed.name || "read_file";
          const targetPath =
            parsed.arguments?.path || parsed.arguments?.filePath || parsed.path || parsed.filePath;

          const args = parsed.arguments || {
            path: targetPath,
            startLine: parsed.startLine,
            endLine: parsed.endLine,
          };

          return {
            id: `call_text_${Date.now()}`,
            name,
            args,
          };
        }
      }
    } catch {
      // Ignore text JSON parse failures
    }
  }

  return null;
}
