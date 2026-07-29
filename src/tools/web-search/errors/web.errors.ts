export type WebToolErrorCode =
  | "SEARCH_TIMEOUT"
  | "SEARCH_PROVIDER_ERROR"
  | "SEARCH_PARSE_ERROR"
  | "FETCH_TIMEOUT"
  | "FETCH_BLOCKED_URL"
  | "FETCH_CONTENT_LIMIT_EXCEEDED"
  | "FETCH_PROVIDER_ERROR"
  | "FETCH_INVALID_CONTENT_TYPE";

export class WebToolError extends Error {
  constructor(
    public code: WebToolErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "WebToolError";
  }
}
