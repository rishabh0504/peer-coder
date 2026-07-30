export interface AgentState {
  sessionId: string;
  userRequest: string;
  currentAgent?: string;
  messages?: any[];
}
