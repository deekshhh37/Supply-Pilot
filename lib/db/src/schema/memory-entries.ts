import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoryEntriesTable = pgTable("memory_entries", {
  id: text("id").primaryKey(),
  scenarioType: text("scenario_type").notNull(),
  incidentSummary: text("incident_summary").notNull(),
  decision: text("decision").notNull(),
  outcome: text("outcome").notNull(),
  feedback: text("feedback"),
  confidenceAtDecision: real("confidence_at_decision").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntriesTable);
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;
export type MemoryEntryRow = typeof memoryEntriesTable.$inferSelect;
