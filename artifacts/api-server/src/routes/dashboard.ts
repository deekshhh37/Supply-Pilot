import { Router, type IRouter } from "express";
import { db, scenarioRunsTable, recommendationsTable, memoryEntriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [runs, recs, memory] = await Promise.all([
    db.select().from(scenarioRunsTable).orderBy(scenarioRunsTable.createdAt),
    db.select().from(recommendationsTable),
    db.select().from(memoryEntriesTable),
  ]);

  const totalRuns = runs.length;
  const totalRecommendations = recs.length;

  const approved = memory.filter((m) => m.outcome === "approved").length;
  const approvalRate = memory.length > 0 ? Math.round((approved / memory.length) * 100) / 100 : 0;

  const avgConfidence = recs.length > 0
    ? Math.round(recs.reduce((sum, r) => sum + r.confidenceScore, 0) / recs.length * 10) / 10
    : 0;

  const recentRuns = runs.slice(-5).reverse().map((r) => {
    const storedRecs = (r.recommendations as any[]) ?? [];
    const topConf = storedRecs.length > 0 ? Math.max(...storedRecs.map((x: any) => x.confidenceScore ?? 0)) : 0;
    return {
      id: r.id,
      scenarioType: r.scenarioType,
      scenarioName: r.scenarioName,
      status: r.status,
      recommendationCount: storedRecs.length,
      topConfidence: topConf,
      createdAt: r.createdAt,
    };
  });

  // Agent stats from timeline data
  const agentMap = new Map<string, { name: string; total: number; durationSum: number; successCount: number }>();
  for (const run of runs) {
    const timeline = (run.agentTimeline as any[]) ?? [];
    for (const entry of timeline) {
      if (!agentMap.has(entry.agentId)) {
        agentMap.set(entry.agentId, { name: entry.agentName, total: 0, durationSum: 0, successCount: 0 });
      }
      const stat = agentMap.get(entry.agentId)!;
      stat.total++;
      stat.durationSum += entry.durationMs ?? 0;
      if (entry.status === "completed") stat.successCount++;
    }
  }
  const agentStats = Array.from(agentMap.entries()).map(([agentId, s]) => ({
    agentId,
    agentName: s.name,
    totalInvocations: s.total,
    avgDurationMs: s.total > 0 ? Math.round(s.durationSum / s.total) : 0,
    successRate: s.total > 0 ? Math.round((s.successCount / s.total) * 100) / 100 : 1,
  }));

  // Scenario breakdown
  const scenarioMap = new Map<string, { count: number; confSum: number }>();
  for (const run of runs) {
    const storedRecs = (run.recommendations as any[]) ?? [];
    const avgConf = storedRecs.length > 0 ? storedRecs.reduce((s: number, r: any) => s + (r.confidenceScore ?? 0), 0) / storedRecs.length : 0;
    if (!scenarioMap.has(run.scenarioType)) {
      scenarioMap.set(run.scenarioType, { count: 0, confSum: 0 });
    }
    const sc = scenarioMap.get(run.scenarioType)!;
    sc.count++;
    sc.confSum += avgConf;
  }
  const scenarioBreakdown = Array.from(scenarioMap.entries()).map(([scenarioType, s]) => ({
    scenarioType,
    count: s.count,
    avgConfidence: s.count > 0 ? Math.round(s.confSum / s.count * 10) / 10 : 0,
  }));

  res.json({ totalRuns, totalRecommendations, approvalRate, avgConfidence, recentRuns, agentStats, scenarioBreakdown });
});

export default router;
