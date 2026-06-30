export interface AgentResult {
  agentId: string;
  agentName: string;
  status: "completed" | "failed";
  startTime: Date;
  endTime: Date;
  durationMs: number;
  outputSummary: string;
  insights: string[];
  dataPoints: Record<string, unknown>;
}

export interface AgentContext {
  scenarioType: string;
  input: string;
  runId: string;
}
