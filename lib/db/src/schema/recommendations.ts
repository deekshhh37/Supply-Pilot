import { pgTable, text, timestamp, jsonb, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationsTable = pgTable("recommendations", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  businessImpact: text("business_impact").notNull(),
  estimatedCost: text("estimated_cost").notNull(),
  status: text("status").notNull().default("pending"),
  evidence: jsonb("evidence").notNull().default([]),
  reasoningTrace: jsonb("reasoning_trace").notNull().default([]),
  confidenceBreakdown: jsonb("confidence_breakdown").notNull().default([]),
  businessRules: jsonb("business_rules").notNull().default([]),
  userFeedback: text("user_feedback"),
  modifiedDescription: text("modified_description"),
  rank: integer("rank").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable);
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type RecommendationRow = typeof recommendationsTable.$inferSelect;
