import { db, memoryEntriesTable, vendorPerformanceTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface MemoryEntry {
  id: string;
  scenarioType: string;
  incidentSummary: string;
  decision: string;
  outcome: string;
  feedback: string | null;
  confidenceAtDecision: number;
  createdAt: Date;
}

export interface VendorPerformanceRecord {
  vendorId: string;
  vendorName: string;
  reliabilityScore: number;
  totalIncidents: number;
  avgLeadTimeDays: number;
  lastIncident: Date | null;
}

export async function storeDecision(entry: Omit<MemoryEntry, "createdAt">): Promise<string> {
  await db.insert(memoryEntriesTable).values({
    id: entry.id,
    scenarioType: entry.scenarioType,
    incidentSummary: entry.incidentSummary,
    decision: entry.decision,
    outcome: entry.outcome,
    feedback: entry.feedback,
    confidenceAtDecision: entry.confidenceAtDecision,
  }).onConflictDoUpdate({
    target: memoryEntriesTable.id,
    set: {
      outcome: entry.outcome,
      feedback: entry.feedback,
    },
  });
  return entry.id;
}

export async function getAllMemory(): Promise<MemoryEntry[]> {
  const rows = await db.select().from(memoryEntriesTable).orderBy(memoryEntriesTable.createdAt);
  return rows.map((r) => ({
    id: r.id,
    scenarioType: r.scenarioType,
    incidentSummary: r.incidentSummary,
    decision: r.decision,
    outcome: r.outcome,
    feedback: r.feedback ?? null,
    confidenceAtDecision: r.confidenceAtDecision,
    createdAt: r.createdAt,
  }));
}

export async function clearAllMemory(): Promise<void> {
  await db.delete(memoryEntriesTable);
}

export async function getVendorPerformance(): Promise<VendorPerformanceRecord[]> {
  const rows = await db.select().from(vendorPerformanceTable);
  return rows.map((r) => ({
    vendorId: r.vendorId,
    vendorName: r.vendorName,
    reliabilityScore: r.reliabilityScore,
    totalIncidents: r.totalIncidents,
    avgLeadTimeDays: r.avgLeadTimeDays,
    lastIncident: r.lastIncident ?? null,
  }));
}

export async function ensureVendorPerformance(vendors: { vendorId: string; vendorName: string; reliabilityScore: number; avgLeadTimeDays: number }[]): Promise<void> {
  for (const v of vendors) {
    await db.insert(vendorPerformanceTable).values({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      reliabilityScore: v.reliabilityScore,
      totalIncidents: 0,
      avgLeadTimeDays: v.avgLeadTimeDays,
    }).onConflictDoNothing();
  }
}

export async function updateVendorIncident(vendorId: string, newIncident: boolean): Promise<void> {
  const [existing] = await db.select().from(vendorPerformanceTable).where(eq(vendorPerformanceTable.vendorId, vendorId));
  if (!existing) return;
  const newTotal = existing.totalIncidents + (newIncident ? 1 : 0);
  const newReliability = Math.max(0.1, existing.reliabilityScore * 0.95 - (newIncident ? 0.02 : 0));
  await db.update(vendorPerformanceTable)
    .set({
      totalIncidents: newTotal,
      reliabilityScore: newReliability,
      lastIncident: newIncident ? new Date() : existing.lastIncident,
    })
    .where(eq(vendorPerformanceTable.vendorId, vendorId));
}

export async function getHistoricalPerformanceScore(scenarioType: string): Promise<number> {
  const entries = await db.select().from(memoryEntriesTable);
  const relevant = entries.filter((e) => e.scenarioType === scenarioType);
  if (relevant.length === 0) return 0.75;
  const approved = relevant.filter((e) => e.outcome === "approved").length;
  const approvalRate = approved / relevant.length;
  const avgConfidence = relevant.reduce((sum, e) => sum + e.confidenceAtDecision, 0) / relevant.length;
  return Math.min(0.95, (approvalRate * 0.6 + (avgConfidence / 100) * 0.4));
}
