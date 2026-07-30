import type { AgentResult } from "../core/agent_result.js";
import { AgentOutcome } from "../core/agent_result.js";
import type { AgentExecutionContext } from "../core/execution_context.js";
import type { AgentHandler } from "../handlers/handler_registry.js";
import { workspaceIntelligenceGraph } from "./graph.js";

export const workspaceIntelligenceHandler: AgentHandler = {
  async execute(state: any, context: AgentExecutionContext): Promise<AgentResult> {
    try {
      const output = await workspaceIntelligenceGraph.invoke({
        ...state,
        sessionId: context.sessionId,
      });

      if (output.status === "failed") {
        const lastErr = output.errors?.[output.errors.length - 1];
        return {
          outcome: AgentOutcome.FAILED,
          error: {
            code: lastErr?.code || "GRAPH_EXECUTION_FAILED",
            message: lastErr?.message || "Workspace intelligence graph execution failed.",
          },
        };
      }

      return {
        outcome: AgentOutcome.SUCCESS,
        data: {
          workspaceContext: output.workspaceContext,
          summary: output.summary,
          status: output.status,
        },
      };
    } catch (err: any) {
      return {
        outcome: AgentOutcome.FAILED,
        error: {
          code: "HANDLER_ERROR",
          message: err.message || String(err),
        },
      };
    }
  },
};
