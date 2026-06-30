import { Router, type IRouter } from "express";
import { db, scenarioRunsTable, recommendationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RunScenarioBody, GetScenarioRunParams } from "@workspace/api-zod";
import { runPlanner } from "../lib/agents/planner.js";
import { ensureVendorPerformance } from "../lib/memory/store.js";
import { getSuppliers } from "../lib/data/loader.js";

const router: IRouter = Router();

const SCENARIOS = [
  {
    id: "vendor_delay",
    name: "Vendor Delay",
    description: "Primary supplier has delayed a critical shipment. Assess impact and identify alternative fulfillment strategies.",
    scenarioType: "vendor_delay",
    inputSample: "SupplierA Corp has notified us that shipment SHP-2024-001 is delayed by 5 days due to port congestion. We have critical items at 2 days of supply.",
    agentsInvolved: ["Planner", "Inventory", "Procurement", "Customer Impact", "Knowledge Retrieval", "Recommendation"],
  },
  {
    id: "inventory_shortage",
    name: "Inventory Shortage",
    description: "Multiple SKUs are below safety stock. Evaluate emergency procurement and demand management options.",
    scenarioType: "inventory_shortage",
    inputSample: "Three SKUs are critically low — Hydraulic Seals Kit at 2 days, Precision Bearings at 2 days, and Chemical Reagent X-400 at 2 days. Demand is outpacing replenishment.",
    agentsInvolved: ["Planner", "Inventory", "Procurement", "Customer Impact", "Knowledge Retrieval", "Recommendation"],
  },
  {
    id: "weather_disruption",
    name: "Weather Disruption",
    description: "A severe weather event is affecting sea and ground freight routes. Rerouting and escalation decisions needed.",
    scenarioType: "weather_disruption",
    inputSample: "Hurricane warning issued for Gulf Coast. Port of Houston and Galveston expected to close for 72-96 hours. Three active shipments in the affected corridor.",
    agentsInvolved: ["Planner", "Weather Risk", "Logistics", "Inventory", "Knowledge Retrieval", "Recommendation"],
  },
  {
    id: "vip_customer_order",
    name: "VIP Customer Order",
    description: "A Platinum-tier customer has a critical order at risk. Reserve stock and prioritize fulfillment.",
    scenarioType: "vip_customer_order",
    inputSample: "National Pharma Distribution (Platinum) has order ORD-8003 for Chemical Reagent X-400 due in 48 hours. Current stock is at 2 days and dropping. Regulatory compliance deadline cannot be missed.",
    agentsInvolved: ["Planner", "Inventory", "Customer Impact", "Procurement", "Knowledge Retrieval", "Recommendation"],
  },
];

router.get("/scenarios", (_req, res): Promise<void> => {
  res.json(SCENARIOS);
  return Promise.resolve();
});

router.get("/scenarios/runs", async (_req, res): Promise<void> => {
  const rows = await db.select().from(scenarioRunsTable).orderBy(scenarioRunsTable.createdAt);
  const summaries = rows.map((r) => {
    const recs = (r.recommendations as any[]) ?? [];
    const topConf = recs.length > 0 ? Math.max(...recs.map((x: any) => x.confidenceScore ?? 0)) : 0;
    return {
      id: r.id,
      scenarioType: r.scenarioType,
      scenarioName: r.scenarioName,
      status: r.status,
      recommendationCount: recs.length,
      topConfidence: topConf,
      createdAt: r.createdAt,
    };
  });
  res.json(summaries);
});

router.post("/scenarios/runs", async (req, res): Promise<void> => {
  const parsed = RunScenarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { scenarioType, input } = parsed.data;

  // Ensure vendor performance seeded
  const suppliers = getSuppliers();
  await ensureVendorPerformance(suppliers.map((s) => ({
    vendorId: s.supplierId,
    vendorName: s.name,
    reliabilityScore: s.reliabilityScore,
    avgLeadTimeDays: s.avgLeadTimeDays,
  })));

  req.log.info({ scenarioType }, "Running scenario");
  const result = await runPlanner(scenarioType, input);

  // Persist run
  await db.insert(scenarioRunsTable).values({
    id: result.id,
    scenarioType: result.scenarioType,
    scenarioName: result.scenarioName,
    input: result.input,
    status: result.status,
    plannerReasoning: result.plannerReasoning,
    agentsInvoked: result.agentsInvoked as any,
    agentTimeline: result.agentTimeline as any,
    recommendations: result.recommendations as any,
    createdAt: result.createdAt,
    completedAt: result.completedAt,
  });

  // Persist recommendations separately
  for (const rec of result.recommendations) {
    await db.insert(recommendationsTable).values({
      id: rec.id,
      runId: rec.runId,
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
      confidenceScore: rec.confidenceScore,
      businessImpact: rec.businessImpact,
      estimatedCost: rec.estimatedCost,
      status: rec.status,
      evidence: rec.evidence as any,
      reasoningTrace: rec.reasoningTrace as any,
      confidenceBreakdown: rec.confidenceBreakdown as any,
      businessRules: rec.businessRules as any,
      rank: rec.rank,
    });
  }

  res.status(201).json(result);
});

router.get("/scenarios/runs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetScenarioRunParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db.select().from(scenarioRunsTable).where(eq(scenarioRunsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Scenario run not found" });
    return;
  }

  // Get latest recommendation status from recommendations table
  const recs = await db.select().from(recommendationsTable).where(eq(recommendationsTable.runId, row.id));
  const recsMap = new Map(recs.map((r) => [r.id, r]));

  const storedRecs = (row.recommendations as any[]) ?? [];
  const mergedRecs = storedRecs.map((r: any) => {
    const live = recsMap.get(r.id);
    if (live) {
      return { ...r, status: live.status, userFeedback: live.userFeedback, modifiedDescription: live.modifiedDescription };
    }
    return r;
  });

  res.json({ ...row, recommendations: mergedRecs });
});

export default router;
