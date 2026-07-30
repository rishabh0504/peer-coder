import { END, START, StateGraph } from "@langchain/langgraph";

import {
  analyzeWorkspace,
  buildWorkspaceContext,
  handleError,
  summarizeWorkspace,
  validateWorkspaceInput,
} from "./nodes.js";

const graphStateChannels = {
  sessionId: {
    value: (x: string, y: string) => y ?? x,
    default: () => "",
  },
  workspacePath: {
    value: (x: string, y: string) => y ?? x,
    default: () => "",
  },
  analysisResult: {
    value: (x: any, y: any) => y ?? x,
  },
  workspaceContext: {
    value: (x: any, y: any) => y ?? x,
  },
  summary: {
    value: (x: any, y: any) => y ?? x,
  },
  errors: {
    value: (x: any[] | undefined, y: any[] | undefined) => (x ?? []).concat(y ?? []),
    default: () => [],
  },
  status: {
    value: (x: string, y: string) => y ?? x,
    default: () => "running",
  },
  includeSummary: {
    value: (x: boolean | undefined, y: boolean | undefined) => y ?? x,
    default: () => false,
  },
  agentName: {
    value: (x: string, y: string) => y ?? x,
    default: () => "Workspace Intelligence Agent",
  },
  executionMetadata: {
    value: (x: any, y: any) => ({ ...x, ...y }),
    default: () => ({ startedAt: "" }),
  },
  userRequest: {
    value: (x: string, y: string) => y ?? x,
    default: () => "",
  },
  currentAgent: {
    value: (x: string | undefined, y: string | undefined) => y ?? x,
  },
  messages: {
    value: (x: any[] | undefined, y: any[] | undefined) => (x ?? []).concat(y ?? []),
    default: () => [],
  },
};

const builder = new StateGraph<any>({
  channels: graphStateChannels as any,
})
  .addNode("workspace.validate_input", validateWorkspaceInput as any)
  .addNode("workspace.analyze", analyzeWorkspace as any)
  .addNode("workspace.build_context", buildWorkspaceContext as any)
  .addNode("workspace.summarize", summarizeWorkspace as any)
  .addNode("workspace.handle_error", handleError as any);

builder.addEdge(START, "workspace.validate_input");

builder.addConditionalEdges(
  "workspace.validate_input",
  (state: any) => {
    if (state.status === "failed") {
      return "fail";
    }
    return "analyze";
  },
  {
    analyze: "workspace.analyze",
    fail: "workspace.handle_error",
  },
);

builder.addConditionalEdges(
  "workspace.analyze",
  (state: any) => {
    if (state.status === "failed") {
      return "fail";
    }
    return "build";
  },
  {
    build: "workspace.build_context",
    fail: "workspace.handle_error",
  },
);

builder.addConditionalEdges(
  "workspace.build_context",
  (state: any) => {
    if (state.status === "failed") {
      return "fail";
    }
    if (state.includeSummary) {
      return "summarize";
    }
    return "end";
  },
  {
    summarize: "workspace.summarize",
    fail: "workspace.handle_error",
    end: END,
  },
);

builder.addEdge("workspace.summarize", END);
builder.addEdge("workspace.handle_error", END);

export const workspaceIntelligenceGraph = builder.compile() as any;
export type WorkspaceIntelligenceGraphType = typeof workspaceIntelligenceGraph;
