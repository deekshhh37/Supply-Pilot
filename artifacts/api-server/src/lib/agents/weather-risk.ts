import type { AgentResult, AgentContext } from "./types.js";

interface WeatherAlert {
  region: string;
  severity: "critical" | "high" | "moderate" | "low";
  type: string;
  affectedRoutes: string[];
  portsAffected: string[];
  description: string;
  etaClearance: string;
}

// Realistic synthetic weather data for the scenario
const WEATHER_DATA: WeatherAlert[] = [
  {
    region: "Gulf Coast",
    severity: "high",
    type: "Hurricane Warning",
    affectedRoutes: ["Houston-Dallas", "Houston-Atlanta", "Gulf Sea Routes"],
    portsAffected: ["Port of Houston", "Port of Galveston"],
    description: "Category 2 hurricane approaching Gulf Coast. Port closures expected for 48-72 hours. Significant disruption to sea freight and ground transport.",
    etaClearance: "72-96 hours",
  },
  {
    region: "Northeast Corridor",
    severity: "moderate",
    type: "Heavy Snowstorm",
    affectedRoutes: ["Newark-Boston", "Newark-Philadelphia"],
    portsAffected: [],
    description: "Major snowstorm expected with 12-18 inches. Ground freight delays of 24-48 hours anticipated.",
    etaClearance: "24-36 hours",
  },
];

export async function runWeatherRiskAgent(ctx: AgentContext): Promise<AgentResult> {
  const start = new Date();
  await delay(190);

  const alerts = WEATHER_DATA;
  const severe = alerts.filter((a) => a.severity === "critical" || a.severity === "high");
  const moderate = alerts.filter((a) => a.severity === "moderate");

  const insights: string[] = [];
  for (const alert of alerts) {
    insights.push(`${alert.region}: ${alert.type} — Severity: ${alert.severity.toUpperCase()}. ${alert.description}`);
    if (alert.portsAffected.length > 0) {
      insights.push(`Ports affected: ${alert.portsAffected.join(", ")}. ETA to clearance: ${alert.etaClearance}`);
    }
    if (alert.affectedRoutes.length > 0) {
      insights.push(`Ground routes affected: ${alert.affectedRoutes.join(", ")}`);
    }
  }

  const overallSeverity = severe.length > 0 ? "high" : moderate.length > 0 ? "moderate" : "low";
  insights.push(`Overall weather risk level: ${overallSeverity.toUpperCase()}`);
  if (severe.length > 0) {
    insights.push(`Recommendation: Consider air freight for critical shipments in affected regions`);
  }

  const end = new Date();
  return {
    agentId: "weather-risk",
    agentName: "Weather Risk Agent",
    status: "completed",
    startTime: start,
    endTime: end,
    durationMs: end.getTime() - start.getTime(),
    outputSummary: `${alerts.length} active weather alert(s). ${severe.length} severe, ${moderate.length} moderate. Overall risk: ${overallSeverity.toUpperCase()}.`,
    insights,
    dataPoints: { alerts, severe, moderate, overallSeverity },
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
