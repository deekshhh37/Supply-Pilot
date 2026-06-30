import { Router, type IRouter } from "express";
import { getAllMemory, clearAllMemory, getVendorPerformance } from "../lib/memory/store.js";

const router: IRouter = Router();

router.get("/memory", async (_req, res): Promise<void> => {
  const [incidents, vendorPerformance] = await Promise.all([
    getAllMemory(),
    getVendorPerformance(),
  ]);

  const totalDecisions = incidents.length;
  const approved = incidents.filter((i) => i.outcome === "approved").length;
  const approvalRate = totalDecisions > 0 ? Math.round((approved / totalDecisions) * 100) / 100 : 0;

  res.json({
    incidents: incidents.map((i) => ({
      id: i.id,
      scenarioType: i.scenarioType,
      incidentSummary: i.incidentSummary,
      decision: i.decision,
      outcome: i.outcome,
      feedback: i.feedback,
      confidenceAtDecision: i.confidenceAtDecision,
      createdAt: i.createdAt,
    })),
    vendorPerformance: vendorPerformance.map((v) => ({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      reliabilityScore: v.reliabilityScore,
      totalIncidents: v.totalIncidents,
      avgLeadTimeDays: v.avgLeadTimeDays,
      lastIncident: v.lastIncident,
    })),
    totalDecisions,
    approvalRate,
  });
});

router.delete("/memory", async (_req, res): Promise<void> => {
  await clearAllMemory();
  res.sendStatus(204);
});

export default router;
