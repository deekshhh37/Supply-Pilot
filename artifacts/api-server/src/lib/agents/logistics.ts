import { getShipments } from "../data/loader.js";
import type { AgentResult, AgentContext } from "./types.js";

export async function runLogisticsAgent(ctx: AgentContext): Promise<AgentResult> {
  const start = new Date();
  await delay(320);

  const shipments = getShipments();
  const delayed = shipments.filter((s) => s.status === "delayed" || s.delayDays > 0);
  const atRisk = shipments.filter((s) => s.status === "at_risk");
  const weatherAffected = shipments.filter((s) => s.weatherRisk === "high" || s.weatherRisk === "moderate");

  const insights: string[] = [];

  for (const s of delayed) {
    insights.push(`Shipment ${s.shipmentId}: delayed ${s.delayDays} day(s). Reason: ${s.delayReason ?? "Unknown"}. New ETA: ${s.currentEta}`);
  }
  for (const s of atRisk) {
    insights.push(`Shipment ${s.shipmentId}: AT RISK due to ${s.delayReason ?? "weather event"}. Current ETA: ${s.currentEta}`);
  }
  if (weatherAffected.length > 0) {
    insights.push(`${weatherAffected.length} shipment(s) affected by weather conditions`);
  }

  const totalDelayDays = delayed.reduce((sum, s) => sum + s.delayDays, 0);
  const avgDelay = delayed.length > 0 ? (totalDelayDays / delayed.length).toFixed(1) : "0";
  insights.push(`Average delay across affected shipments: ${avgDelay} days`);

  const end = new Date();
  return {
    agentId: "logistics",
    agentName: "Logistics Agent",
    status: "completed",
    startTime: start,
    endTime: end,
    durationMs: end.getTime() - start.getTime(),
    outputSummary: `Analyzed ${shipments.length} shipments. ${delayed.length} delayed, ${atRisk.length} at-risk, ${weatherAffected.length} weather-affected.`,
    insights,
    dataPoints: { shipments, delayed, atRisk, weatherAffected, avgDelayDays: parseFloat(avgDelay) },
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
