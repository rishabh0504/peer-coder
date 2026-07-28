export interface ToolError {
  code: string;
  message: string;
}

export interface ToolMetadata {
  executionId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolError;
  metadata?: ToolMetadata;
}

export function createSuccessResponse<T>(data: T, metadata?: ToolMetadata): ToolResponse<T> {
  return {
    success: true,
    data,
    metadata,
  };
}

export function createErrorResponse<T = undefined>(
  code: string,
  message: string,
  metadata?: ToolMetadata,
): ToolResponse<T> {
  return {
    success: false,
    error: { code, message },
    metadata,
  };
}
