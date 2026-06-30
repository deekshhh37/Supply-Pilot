import { getInventory, getWarehouses } from "../data/loader.js";
import type { AgentResult, AgentContext } from "./types.js";
import { inventoryHealthScore } from "../reasoning/engine.js";

export async function runInventoryAgent(ctx: AgentContext): Promise<AgentResult> {
  const start = new Date();
  await delay(280);

  const inventory = getInventory();
  const warehouses = getWarehouses();

  const criticalItems = inventory.filter((i) => i.daysOfSupply < 3);
  const atRiskItems = inventory.filter((i) => i.daysOfSupply >= 3 && i.daysOfSupply < 7);
  const overstockItems = inventory.filter((i) => i.daysOfSupply > 60);

  const insights: string[] = [];
  if (criticalItems.length > 0) {
    insights.push(`${criticalItems.length} item(s) in CRITICAL status: ${criticalItems.map((i) => i.name).join(", ")}`);
  }
  if (atRiskItems.length > 0) {
    insights.push(`${atRiskItems.length} item(s) AT RISK: ${atRiskItems.map((i) => i.name).join(", ")}`);
  }
  if (overstockItems.length > 0) {
    insights.push(`${overstockItems.length} item(s) overstocked (>60 days supply)`);
  }

  const mostCritical = criticalItems.length > 0 ? criticalItems[0] : atRiskItems[0];
  if (mostCritical) {
    const healthScore = inventoryHealthScore(mostCritical.daysOfSupply, mostCritical.safetyStock, mostCritical.avgDailyDemand);
    insights.push(`${mostCritical.name}: ${mostCritical.daysOfSupply.toFixed(1)} days of supply remaining (health score: ${Math.round(healthScore * 100)}%)`);
    insights.push(`Safety stock threshold for ${mostCritical.name}: ${mostCritical.safetyStock} units`);
  }

  const availableWarehouses = warehouses.filter((w) => w.capacityPct < 85);
  if (availableWarehouses.length > 0) {
    insights.push(`${availableWarehouses.length} warehouse(s) have capacity for emergency stock transfers`);
  }

  const end = new Date();
  return {
    agentId: "inventory",
    agentName: "Inventory Agent",
    status: "completed",
    startTime: start,
    endTime: end,
    durationMs: end.getTime() - start.getTime(),
    outputSummary: `Analyzed ${inventory.length} SKUs across ${warehouses.length} warehouses. Found ${criticalItems.length} critical and ${atRiskItems.length} at-risk items.`,
    insights,
    dataPoints: {
      totalItems: inventory.length,
      criticalCount: criticalItems.length,
      atRiskCount: atRiskItems.length,
      overstockCount: overstockItems.length,
      criticalItems: criticalItems.map((i) => ({ ...i, healthScore: inventoryHealthScore(i.daysOfSupply, i.safetyStock, i.avgDailyDemand) })),
      atRiskItems,
      warehouses,
    },
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
