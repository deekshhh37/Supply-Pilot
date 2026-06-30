import { pgTable, text, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scenarioRunsTable = pgTable("scenario_runs", {
  id: text("id").primaryKey(),
  scenarioType: text("scenario_type").notNull(),
  scenarioName: text("scenario_name").notNull(),
  input: text("input").notNull(),
  status: text("status").notNull().default("completed"),
  plannerReasoning: text("planner_reasoning").notNull().default(""),
  agentsInvoked: jsonb("agents_invoked").notNull().default([]),
  agentTimeline: jsonb("agent_timeline").notNull().default([]),
  recommendations: jsonb("recommendations").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertScenarioRunSchema = createInsertSchema(scenarioRunsTable);
export type InsertScenarioRun = z.infer<typeof insertScenarioRunSchema>;
export type ScenarioRunRow = typeof scenarioRunsTable.$inferSelect;
