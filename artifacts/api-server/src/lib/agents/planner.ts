import { v4 as uuidv4 } from "uuid";
import type { AgentContext } from "./types.js";
import { runInventoryAgent } from "./inventory.js";
import { runLogisticsAgent } from "./logistics.js";
import { runProcurementAgent } from "./procurement.js";
import { runCustomerImpactAgent } from "./customer-impact.js";
import { runWeatherRiskAgent } from "./weather-risk.js";
import { runKnowledgeRetrievalAgent } from "./knowledge-retrieval.js";
import { runRecommendationAgent, type RecommendationOutput } from "./recommendation.js";
import { getInventory, getSuppliers, getShipments, getOrders } from "../data/loader.js";
import { getHistoricalPerformanceScore } from "../memory/store.js";
import { initKnowledgeBase } from "../rag/knowledge-base.js";

export interface AgentExecutionRecord {
  agentId: string;
  agentName: string;
  status: string;
  startTime: Date;
  endTime: Date | null;
  durationMs: number;
  outputSummary: string;
  insights: string[];
}

export interface PlannerResult {
  id: string;
  scenarioType: string;
  scenarioName: string;
  input: string;
  status: string;
  plannerReasoning: string;
  agentsInvoked: string[];
  agentTimeline: AgentExecutionRecord[];
  recommendations: RecommendationOutput[];
  createdAt: Date;
  completedAt: Date;
}

const SCENARIO_NAMES: Record<string, string> = {
  vendor_delay: "Vendor Delay",
  inventory_shortage: "Inventory Shortage",
  weather_disruption: "Weather Disruption",
  vip_customer_order: "VIP Customer Order",
  custom: "Custom Scenario",
};

const AGENT_PLANS: Record<string, string[]> = {
  vendor_delay: ["inventory", "procurement", "customer-impact", "knowledge-retrieval", "recommendation"],
  inventory_shortage: ["inventory", "procurement", "customer-impact", "knowledge-retrieval", "recommendation"],
  weather_disruption: ["weather-risk", "logistics", "inventory", "knowledge-retrieval", "recommendation"],
  vip_customer_order: ["inventory", "customer-impact", "procurement", "knowledge-retrieval", "recommendation"],
  custom: ["inventory", "procurement", "logistics", "customer-impact", "knowledge-retrieval", "recommendation"],
};

function buildPlannerReasoning(scenarioType: string, input: string, agentsSelected: string[]): string {
  const lines: string[] = [
    `Planner Agent analyzing scenario: "${input.substring(0, 120)}${input.length > 120 ? "..." : ""}"`,
    "",
    `Scenario Classification: ${SCENARIO_NAMES[scenarioType] ?? "Custom"}`,
    "",
    "Problem Analysis:",
  ];

  switch (scenarioType) {
    case "vendor_delay":
      lines.push("- Detected: Primary supplier delay signal");
      lines.push("- Risk: Potential stockout if supplier cannot deliver within current inventory window");
      lines.push("- Key factors: Inventory health, supplier reliability, customer SLA exposure");
      lines.push("- Strategy: Assess stock levels, identify alternatives, evaluate customer impact");
      break;
    case "inventory_shortage":
      lines.push("- Detected: Inventory below safety stock threshold");
      lines.push("- Risk: Imminent stockout affecting order fulfillment capability");
      lines.push("- Key factors: Days of supply, reorder urgency, demand pattern");
      lines.push("- Strategy: Assess stock, identify procurement options, evaluate demand management");
      break;
    case "weather_disruption":
      lines.push("- Detected: Active weather event in supply chain corridor");
      lines.push("- Risk: Transit delays and potential port closures");
      lines.push("- Key factors: Weather severity, affected routes, shipment criticality");
      lines.push("- Strategy: Assess weather risk, reroute options, logistics alternatives");
      break;
    case "vip_customer_order":
      lines.push("- Detected: Priority customer order requiring expedited fulfillment");
      lines.push("- Risk: SLA breach for high-value Platinum tier customer");
      lines.push("- Key factors: Current stock availability, fulfillment timeline, SLA window");
      lines.push("- Strategy: Reserve stock, expedite processing, assess procurement needs");
      break;
    default:
      lines.push("- Detected: Multi-factor supply chain disruption");
      lines.push("- Running full agent suite for comprehensive analysis");
  }

  lines.push("");
  lines.push(`Agent Orchestration Plan (${agentsSelected.length} agents selected):`);
  const agentDescriptions: Record<string, string> = {
    "inventory": "→ Inventory Agent: Assess stock levels, health scores, shortage risks",
    "logistics": "→ Logistics Agent: Evaluate shipment status, transit delays, carrier options",
    "procurement": "→ Procurement Agent: Identify supplier options, lead times, cost deltas",
    "customer-impact": "→ Customer Impact Agent: Quantify SLA exposure, business risk by customer tier",
    "weather-risk": "→ Weather Risk Agent: Fetch and assess active weather alerts",
    "knowledge-retrieval": "→ Knowledge Retrieval Agent: Search policy/SOP documents using TF-IDF RAG",
    "recommendation": "→ Recommendation Agent: Generate ranked Next Best Actions with confidence scores",
  };
  for (const a of agentsSelected) {
    if (agentDescriptions[a]) lines.push(agentDescriptions[a]);
  }
  lines.push("");
  lines.push("Note: Agents NOT invoked (insufficient relevance for this scenario type):");
  const allAgents = Object.keys(agentDescriptions);
  const notInvoked = allAgents.filter((a) => !agentsSelected.includes(a) && a !== "recommendation" && a !== "knowledge-retrieval");
  if (notInvoked.length === 0) lines.push("→ All relevant agents invoked");
  else notInvoked.forEach((a) => lines.push(`→ ${a} (not relevant to ${SCENARIO_NAMES[scenarioType] ?? "this"} scenario)`));

  return lines.join("\n");
}

export async function runPlanner(scenarioType: string, input: string): Promise<PlannerResult> {
  const runId = uuidv4();
  const createdAt = new Date();

  initKnowledgeBase();

  const agentPlan = AGENT_PLANS[scenarioType] ?? AGENT_PLANS.custom;
  const plannerReasoning = buildPlannerReasoning(scenarioType, input, agentPlan);

  const timeline: AgentExecutionRecord[] = [];
  const ctx: AgentContext = { scenarioType, input, runId };

  // Add planner entry
  const plannerStart = new Date();
  await delay(150);
  timeline.push({
    agentId: "planner",
    agentName: "Planner Agent",
    status: "completed",
    startTime: plannerStart,
    endTime: new Date(),
    durationMs: new Date().getTime() - plannerStart.getTime(),
    outputSummary: `Classified scenario as ${SCENARIO_NAMES[scenarioType] ?? "Custom"}. Selected ${agentPlan.length} specialized agents for execution.`,
    insights: [
      `Scenario type: ${SCENARIO_NAMES[scenarioType] ?? scenarioType}`,
      `Agents selected: ${agentPlan.filter((a) => a !== "recommendation" && a !== "knowledge-retrieval").join(", ")}`,
      `Reasoning: ${agentPlan.length} agents required (not invoking all — only relevant agents)`,
    ],
  });

  const historicalScore = await getHistoricalPerformanceScore(scenarioType);

  // Run agents based on scenario
  let inventoryResult = null;
  let logisticsResult = null;
  let procurementResult = null;
  let customerImpactResult = null;
  let weatherRiskResult = null;
  let knowledgeResult = null;

  for (const agentId of agentPlan) {
    switch (agentId) {
      case "inventory": {
        const r = await runInventoryAgent(ctx);
        inventoryResult = r;
        timeline.push({ ...r, endTime: r.endTime });
        break;
      }
      case "logistics": {
        const r = await runLogisticsAgent(ctx);
        logisticsResult = r;
        timeline.push({ ...r, endTime: r.endTime });
        break;
      }
      case "procurement": {
        const r = await runProcurementAgent(ctx);
        procurementResult = r;
        timeline.push({ ...r, endTime: r.endTime });
        break;
      }
      case "customer-impact": {
        const r = await runCustomerImpactAgent(ctx);
        customerImpactResult = r;
        timeline.push({ ...r, endTime: r.endTime });
        break;
      }
      case "weather-risk": {
        const r = await runWeatherRiskAgent(ctx);
        weatherRiskResult = r;
        timeline.push({ ...r, endTime: r.endTime });
        break;
      }
      case "knowledge-retrieval": {
        const r = await runKnowledgeRetrievalAgent(ctx);
        knowledgeResult = r;
        timeline.push({ ...r.agentResult, endTime: r.agentResult.endTime });
        break;
      }
      case "recommendation": {
        const { agentResult, recommendations } = await runRecommendationAgent({
          runId,
          scenarioType,
          input,
          inventoryItems: getInventory(),
          suppliers: getSuppliers(),
          shipments: getShipments(),
          orders: getOrders(),
          knowledgeChunks: knowledgeResult?.chunks ?? [],
          historicalScore,
        });
        timeline.push({ ...agentResult, endTime: agentResult.endTime });

        const completedAt = new Date();
        return {
          id: runId,
          scenarioType,
          scenarioName: SCENARIO_NAMES[scenarioType] ?? "Custom",
          input,
          status: "completed",
          plannerReasoning,
          agentsInvoked: agentPlan,
          agentTimeline: timeline,
          recommendations,
          createdAt,
          completedAt,
        };
      }
    }
  }

  // Fallback (shouldn't reach here)
  return {
    id: runId,
    scenarioType,
    scenarioName: SCENARIO_NAMES[scenarioType] ?? "Custom",
    input,
    status: "completed",
    plannerReasoning,
    agentsInvoked: agentPlan,
    agentTimeline: timeline,
    recommendations: [],
    createdAt,
    completedAt: new Date(),
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
