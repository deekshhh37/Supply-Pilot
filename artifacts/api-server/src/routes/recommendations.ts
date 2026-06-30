import { Router, type IRouter } from "express";
import { db, recommendationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ApproveRecommendationParams, ApproveRecommendationBody, RejectRecommendationParams, RejectRecommendationBody, ModifyRecommendationParams, ModifyRecommendationBody } from "@workspace/api-zod";
import { storeDecision, updateVendorIncident } from "../lib/memory/store.js";
import { v4 as uuidv4 } from "uuid";

const router: IRouter = Router();

router.post("/recommendations/:id/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ApproveRecommendationParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = ApproveRecommendationBody.safeParse(req.body ?? {});
  const notes = body.success ? body.data.notes : undefined;

  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, params.data.id));
  if (!rec) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  const [updated] = await db
    .update(recommendationsTable)
    .set({ status: "approved", userFeedback: notes ?? null })
    .where(eq(recommendationsTable.id, params.data.id))
    .returning();

  const memoryId = uuidv4();
  await storeDecision({
    id: memoryId,
    scenarioType: "approved_action",
    incidentSummary: rec.title,
    decision: rec.description,
    outcome: "approved",
    feedback: notes ?? null,
    confidenceAtDecision: rec.confidenceScore,
  });

  req.log.info({ id: params.data.id }, "Recommendation approved");
  res.json({ success: true, recommendation: { ...updated, evidence: rec.evidence, reasoningTrace: rec.reasoningTrace, confidenceBreakdown: rec.confidenceBreakdown, businessRules: rec.businessRules }, memoryId });
});

router.post("/recommendations/:id/reject", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RejectRecommendationParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = RejectRecommendationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, params.data.id));
  if (!rec) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  const [updated] = await db
    .update(recommendationsTable)
    .set({ status: "rejected", userFeedback: body.data.feedback })
    .where(eq(recommendationsTable.id, params.data.id))
    .returning();

  const memoryId = uuidv4();
  await storeDecision({
    id: memoryId,
    scenarioType: "rejected_action",
    incidentSummary: rec.title,
    decision: rec.description,
    outcome: "rejected",
    feedback: body.data.feedback,
    confidenceAtDecision: rec.confidenceScore,
  });

  req.log.info({ id: params.data.id }, "Recommendation rejected");
  res.json({ success: true, recommendation: { ...updated, evidence: rec.evidence, reasoningTrace: rec.reasoningTrace, confidenceBreakdown: rec.confidenceBreakdown, businessRules: rec.businessRules }, memoryId });
});

router.post("/recommendations/:id/modify", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ModifyRecommendationParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = ModifyRecommendationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, params.data.id));
  if (!rec) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  const [updated] = await db
    .update(recommendationsTable)
    .set({ status: "modified", modifiedDescription: body.data.modifiedDescription, userFeedback: body.data.notes ?? null })
    .where(eq(recommendationsTable.id, params.data.id))
    .returning();

  const memoryId = uuidv4();
  await storeDecision({
    id: memoryId,
    scenarioType: "modified_action",
    incidentSummary: rec.title,
    decision: body.data.modifiedDescription,
    outcome: "modified",
    feedback: body.data.notes ?? null,
    confidenceAtDecision: rec.confidenceScore,
  });

  req.log.info({ id: params.data.id }, "Recommendation modified");
  res.json({ success: true, recommendation: { ...updated, evidence: rec.evidence, reasoningTrace: rec.reasoningTrace, confidenceBreakdown: rec.confidenceBreakdown, businessRules: rec.businessRules }, memoryId });
});

export default router;
