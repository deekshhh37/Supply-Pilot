import { pgTable, text, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorPerformanceTable = pgTable("vendor_performance", {
  vendorId: text("vendor_id").primaryKey(),
  vendorName: text("vendor_name").notNull(),
  reliabilityScore: real("reliability_score").notNull().default(0.8),
  totalIncidents: integer("total_incidents").notNull().default(0),
  avgLeadTimeDays: real("avg_lead_time_days").notNull().default(3),
  lastIncident: timestamp("last_incident"),
});

export const insertVendorPerformanceSchema = createInsertSchema(vendorPerformanceTable);
export type InsertVendorPerformance = z.infer<typeof insertVendorPerformanceSchema>;
export type VendorPerformanceRow = typeof vendorPerformanceTable.$inferSelect;
