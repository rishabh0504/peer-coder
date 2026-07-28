import type { StructuredTool } from "@langchain/core/tools";
import { executionTools } from "./execution/index.js";
import { fileSystemTools } from "./file-system/index.js";
import { gitTools } from "./git/index.js";
import { searchIndexingTools } from "./search-indexing/index.js";
import { webSearchTools } from "./web-search/index.js";
import { workspaceTools } from "./workspace/index.js";

export const allTools = [
  ...fileSystemTools,
  ...executionTools,
  ...gitTools,
  ...searchIndexingTools,
  ...webSearchTools,
  ...workspaceTools,
];

export const toolsMap = new Map<string, StructuredTool>(
  allTools.map((t) => [t.name, t as unknown as StructuredTool]),
);

export {
  fileSystemTools,
  executionTools,
  gitTools,
  searchIndexingTools,
  webSearchTools,
  workspaceTools,
};
