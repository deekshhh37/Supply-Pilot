import { getOrders } from "../data/loader.js";
import type { AgentResult, AgentContext } from "./types.js";
import { slaUrgencyScore } from "../reasoning/engine.js";

export async function runCustomerImpactAgent(ctx: AgentContext): Promise<AgentResult> {
  const start = new Date();
  await delay(210);

  const orders = getOrders();
  const now = new Date();

  const enriched = orders.map((o) => {
    const delivery = new Date(o.requiredDelivery);
    const remainingMs = delivery.getTime() - now.getTime();
    const remainingHours = remainingMs / 3600000;
    const urgency = slaUrgencyScore(remainingHours);
    return { ...o, remainingHours, urgency };
  });

  const platinum = enriched.filter((o) => o.customerTier === "platinum");
  const atRiskOrders = enriched.filter((o) => o.urgency > 0.5);
  const criticalOrders = enriched.filter((o) => o.urgency > 0.7);

  const insights: string[] = [];
  const tierImpact: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 };

  for (const o of atRiskOrders) {
    tierImpact[o.customerTier] = (tierImpact[o.customerTier] ?? 0) + o.totalValue;
    insights.push(`${o.customerName} (${o.customerTier.toUpperCase()}): Order ${o.orderId} requires delivery by ${o.requiredDelivery}. SLA urgency: ${Math.round(o.urgency * 100)}%`);
  }

  if (platinum.length > 0) {
    const platinumRisk = platinum.filter((o) => o.urgency > 0.3);
    if (platinumRisk.length > 0) {
      const totalRisk = platinumRisk.reduce((sum, o) => sum + o.totalValue, 0);
      insights.push(`Platinum customer revenue at risk: $${totalRisk.toLocaleString()}`);
    }
  }

  const totalRevAtRisk = atRiskOrders.reduce((sum, o) => sum + o.totalValue, 0);
  insights.push(`Total revenue at risk across all SLA-breached orders: $${totalRevAtRisk.toLocaleString()}`);

  const end = new Date();
  return {
    agentId: "customer-impact",
    agentName: "Customer Impact Agent",
    status: "completed",
    startTime: start,
    endTime: end,
    durationMs: end.getTime() - start.getTime(),
    outputSummary: `Analyzed ${orders.length} orders. ${criticalOrders.length} critical SLA risk, ${atRiskOrders.length} at-risk. ${platinum.length} Platinum customer orders in scope.`,
    insights,
    dataPoints: { orders: enriched, atRiskOrders, criticalOrders, platinum, tierImpact, totalRevAtRisk },
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
