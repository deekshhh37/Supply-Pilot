import { getSuppliers } from "../data/loader.js";
import type { AgentResult, AgentContext } from "./types.js";

export async function runProcurementAgent(ctx: AgentContext): Promise<AgentResult> {
  const start = new Date();
  await delay(260);

  const suppliers = getSuppliers();
  const delayed = suppliers.filter((s) => s.currentStatus === "delayed");
  const available = suppliers.filter((s) => s.currentStatus === "active");
  const highReliability = available.filter((s) => s.reliabilityScore >= 0.88);
  const probation = suppliers.filter((s) => s.reliabilityScore < 0.75);

  const insights: string[] = [];

  for (const s of delayed) {
    insights.push(`Supplier ${s.name} (${s.supplierId}) is DELAYED: ${s.delayReason ?? "unspecified"}. Delay: ${s.delayDays} days`);
    insights.push(`${s.name} reliability score: ${Math.round(s.reliabilityScore * 100)}% (${s.ytdIncidents} incidents YTD)`);
  }

  if (highReliability.length > 0) {
    const best = highReliability.sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0];
    insights.push(`Best alternative: ${best.name} — ${Math.round(best.reliabilityScore * 100)}% reliability, ${best.avgLeadTimeDays}-day lead time, cost index ${best.costIndex.toFixed(2)}x`);
  }

  if (available.length > 0) {
    const fastestActive = available.sort((a, b) => a.avgLeadTimeDays - b.avgLeadTimeDays)[0];
    insights.push(`Fastest available supplier: ${fastestActive.name} (${fastestActive.avgLeadTimeDays} day lead time)`);
  }

  if (probation.length > 0) {
    insights.push(`${probation.length} supplier(s) on performance probation (reliability <75%)`);
  }

  const end = new Date();
  return {
    agentId: "procurement",
    agentName: "Procurement Agent",
    status: "completed",
    startTime: start,
    endTime: end,
    durationMs: end.getTime() - start.getTime(),
    outputSummary: `Evaluated ${suppliers.length} suppliers. ${delayed.length} delayed, ${available.length} active, ${highReliability.length} high-reliability alternatives available.`,
    insights,
    dataPoints: { suppliers, delayed, available, highReliability, probation },
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
