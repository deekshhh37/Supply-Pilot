import { v4 as uuidv4 } from "uuid";
import type { AgentResult, AgentContext } from "./types.js";
import type { RetrievedChunk } from "../rag/knowledge-base.js";
import {
  computeConfidence,
  inventoryHealthScore,
  slaUrgencyScore,
  leadTimeRiskScore,
  weatherRiskScore,
  costImpactScore,
  type ReasoningSignals,
} from "../reasoning/engine.js";
import type { InventoryItem, Supplier, Shipment, Order } from "../data/loader.js";

export interface RecommendationOutput {
  id: string;
  runId: string;
  title: string;
  description: string;
  priority: string;
  confidenceScore: number;
  businessImpact: string;
  estimatedCost: string;
  status: string;
  evidence: { source: string; excerpt: string; similarityScore: number; type: string }[];
  reasoningTrace: string[];
  confidenceBreakdown: { factor: string; score: number; weight: number; contribution: number; description: string }[];
  businessRules: string[];
  userFeedback: null;
  modifiedDescription: null;
  rank: number;
}

interface RecommendationPlan {
  title: string;
  description: string;
  businessImpact: string;
  estimatedCost: string;
  businessRules: string[];
  reasoningTrace: string[];
  signals: ReasoningSignals;
}

function buildEvidenceFromChunks(chunks: RetrievedChunk[], needed = 3) {
  return chunks.slice(0, needed).map((c) => ({
    source: c.title,
    excerpt: c.content.substring(0, 200) + "...",
    similarityScore: c.similarityScore,
    type: "knowledge_base" as const,
  }));
}

function dataSignal(source: string, excerpt: string): { source: string; excerpt: string; similarityScore: number; type: "knowledge_base" } {
  return { source, excerpt, similarityScore: 0.95, type: "knowledge_base" };
}

function buildVendorDelayRecommendations(
  runId: string,
  suppliers: Supplier[],
  inventoryItems: InventoryItem[],
  orders: Order[],
  knowledgeChunks: RetrievedChunk[],
  historicalScore: number
): RecommendationPlan[] {
  const delayedSupplier = suppliers.find((s) => s.currentStatus === "delayed") ?? suppliers[0];
  const bestAlternative = suppliers
    .filter((s) => s.currentStatus === "active" && s.reliabilityScore >= 0.88)
    .sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0];
  const criticalItem = inventoryItems.find((i) => i.daysOfSupply < 3) ?? inventoryItems[0];
  const platinumOrder = orders.find((o) => o.customerTier === "platinum");

  const delayDays = delayedSupplier.delayDays || 5;
  const daysOfSupply = criticalItem?.daysOfSupply ?? 2;
  const supplierReliability = delayedSupplier.reliabilityScore;
  const altReliability = bestAlternative?.reliabilityScore ?? 0.9;
  const remainingHours = daysOfSupply * 24 - 12;

  return [
    {
      title: `Activate Alternative Supplier: ${bestAlternative?.name ?? "FastTrack Logistics"}`,
      description: `Immediately place emergency purchase order with ${bestAlternative?.name ?? "FastTrack Logistics"} (reliability: ${Math.round(altReliability * 100)}%, lead time: ${bestAlternative?.avgLeadTimeDays ?? 1} day). ${delayedSupplier.name} has delayed shipment by ${delayDays} days due to ${delayedSupplier.delayReason ?? "operational issues"}. Current inventory of ${criticalItem?.name ?? "critical items"} will deplete in ${daysOfSupply.toFixed(1)} days, which falls within the ${delayDays}-day delay window.`,
      businessImpact: `Prevents stockout of ${criticalItem?.name ?? "critical items"} and protects ${platinumOrder?.customerName ?? "Platinum customer"} SLA obligations. Avoids est. $${platinumOrder ? Math.round(platinumOrder.totalValue * 0.2).toLocaleString() : "12,000"} in SLA penalties.`,
      estimatedCost: `+$${Math.round((bestAlternative?.costIndex ?? 1.22) * 2300 - 2000).toLocaleString()} premium (${Math.round(((bestAlternative?.costIndex ?? 1.22) - 1) * 100)}% above standard)`,
      businessRules: [
        "Vendor SLA: delays >24h trigger alternate sourcing evaluation",
        "Procurement Policy: emergency procurement authorized when stockout risk < 72 hours",
        `Inventory: ${daysOfSupply.toFixed(1)} days of supply < ${delayDays}-day delay = imminent stockout`,
      ],
      reasoningTrace: [
        `Planner detected VENDOR_DELAY scenario. Primary supplier: ${delayedSupplier.name}`,
        `Delay magnitude: ${delayDays} days. Delay reason: ${delayedSupplier.delayReason ?? "port congestion"}`,
        `Inventory check: ${criticalItem?.name ?? "critical SKU"} has ${daysOfSupply.toFixed(1)} days of supply`,
        `Lead time risk: ${delayDays} days delay > ${daysOfSupply.toFixed(1)} days stock → STOCKOUT IMMINENT`,
        `Alternative supplier identified: ${bestAlternative?.name ?? "FastTrack"} (${Math.round(altReliability * 100)}% reliability, ${bestAlternative?.avgLeadTimeDays ?? 1}d lead time)`,
        `Knowledge retrieval confirms: emergency procurement authorized per Procurement Policy §3.2`,
        `Confidence computed using weighted multi-factor model (7 signals)`,
      ],
      signals: {
        inventoryHealth: inventoryHealthScore(daysOfSupply, criticalItem?.safetyStock ?? 25, criticalItem?.avgDailyDemand ?? 6),
        slaUrgency: slaUrgencyScore(remainingHours),
        supplierReliability: altReliability,
        leadTimeRisk: leadTimeRiskScore(bestAlternative?.avgLeadTimeDays ?? 1, daysOfSupply),
        weatherRisk: 0.1,
        costImpact: costImpactScore(bestAlternative?.costIndex ?? 1.22),
        historicalPerformance: historicalScore,
      },
    },
    {
      title: "Execute Split Shipment from Available Warehouse Stock",
      description: `Dispatch partial fulfillment from WH-001 (Chicago) using available stock to bridge the gap until alternative supplier delivery arrives. This ensures ${platinumOrder?.customerName ?? "priority customers"} receive partial delivery within SLA. Remaining quantity to be fulfilled by ${bestAlternative?.name ?? "alternative supplier"} on expedited basis.`,
      businessImpact: `Partially satisfies ${platinumOrder?.customerName ?? "Platinum customer"} order on time, maintaining SLA compliance and preventing relationship damage. Demonstrates proactive supply chain management.`,
      estimatedCost: `+$${Math.round(1200 + Math.random() * 400).toLocaleString()} expedited shipping premium for split delivery`,
      businessRules: [
        "Shipping SOP: Split shipment authorized when full delivery would breach SLA by >24 hours",
        "Customer Priority Matrix: Platinum customers require zero SLA breach tolerance",
        "Warehouse Guidelines: Inter-warehouse transfers authorized when source >30 days supply",
      ],
      reasoningTrace: [
        `Customer impact analysis: ${platinumOrder?.customerName ?? "Platinum customer"} order due ${platinumOrder?.requiredDelivery ?? "within 48 hours"}`,
        `Available stock in WH-001 can cover ${Math.round(daysOfSupply * 0.4)} days of demand`,
        `Split shipment option reduces SLA breach risk from CERTAIN to LOW`,
        `Shipping SOP §4.3 authorizes split delivery for SLA-critical orders`,
        `Additional logistics cost is justified by penalty avoidance`,
      ],
      signals: {
        inventoryHealth: 0.35,
        slaUrgency: slaUrgencyScore(remainingHours + 12),
        supplierReliability: 0.85,
        leadTimeRisk: 0.3,
        weatherRisk: 0.1,
        costImpact: 0.65,
        historicalPerformance: historicalScore,
      },
    },
    {
      title: `Issue Formal Vendor Escalation to ${delayedSupplier.name}`,
      description: `Escalate to ${delayedSupplier.name}'s VP of Operations with formal delay notification citing SLA breach per contract terms. Request revised delivery commitment within 4 hours and written root cause analysis. Initiate SLA penalty calculation ($${Math.round(delayedSupplier.contractValue * 0.02).toLocaleString()} per contract clause 8.2).`,
      businessImpact: `Creates formal record for SLA penalties, signals urgency to vendor leadership, and may accelerate partial delivery commitment. Protects company's legal position.`,
      estimatedCost: "No additional cost — SLA penalty recovered from vendor",
      businessRules: [
        "Vendor SLA: delays >24h require written escalation to vendor VP Operations",
        "Escalation Procedures: Level 2 escalation triggered by delay >24 hours",
        `Vendor SLA: ${delayedSupplier.ytdIncidents} incidents YTD — threshold review at 3+ incidents`,
      ],
      reasoningTrace: [
        `${delayedSupplier.name} has ${delayedSupplier.ytdIncidents} incidents YTD (threshold: 3)`,
        `Current delay: ${delayDays} days — exceeds 24-hour notification window`,
        `Escalation Procedures §2.2 requires Manager escalation at 24-hour delay mark`,
        `Contract clause 8.2 specifies 2% penalty on contract value for unresolved delays`,
        `Formal escalation may also unlock expedited resolution from vendor`,
      ],
      signals: {
        inventoryHealth: inventoryHealthScore(daysOfSupply, criticalItem?.safetyStock ?? 25, criticalItem?.avgDailyDemand ?? 6),
        slaUrgency: 0.55,
        supplierReliability: supplierReliability,
        leadTimeRisk: 0.4,
        weatherRisk: 0.05,
        costImpact: 0.95,
        historicalPerformance: historicalScore,
      },
    },
    {
      title: `Proactively Notify ${platinumOrder?.customerName ?? "Affected Customers"} of Potential Delay`,
      description: `Initiate proactive outreach to all Platinum and Gold tier customers with orders dependent on ${delayedSupplier.name} shipments. Provide updated ETA, alternative fulfillment timeline, and goodwill gesture (expedited shipping credit). Assign dedicated account manager for ${platinumOrder?.customerName ?? "Platinum customers"}.`,
      businessImpact: `Preserves customer relationship trust. Proactive communication reduces churn risk by ~60% compared to reactive notification. Demonstrates supply chain visibility maturity.`,
      estimatedCost: "Expedited shipping credit est. $800-$2,000 depending on order size",
      businessRules: [
        "Customer Priority Matrix: Platinum customers require personal account manager contact for any delay",
        "Escalation Procedures: Customer communication required within 2 hours of delay identification",
        "Gold customers: Personal phone call for delays >12 hours",
      ],
      reasoningTrace: [
        `${platinumOrder?.customerName ?? "Platinum customer"} has order ${platinumOrder?.orderId ?? "pending"} with ${platinumOrder?.slaHours ?? 24}-hour SLA`,
        `Delay of ${delayDays} days will breach SLA without intervention`,
        `Customer Priority Matrix requires dedicated account manager contact`,
        `Proactive notification preserves relationship better than reactive`,
        `Goodwill gesture cost ($800-$2,000) < penalty exposure ($${platinumOrder ? Math.round(platinumOrder.totalValue * 0.1).toLocaleString() : "5,000"})`,
      ],
      signals: {
        inventoryHealth: 0.5,
        slaUrgency: slaUrgencyScore(remainingHours + 24),
        supplierReliability: 0.7,
        leadTimeRisk: 0.35,
        weatherRisk: 0.05,
        costImpact: 0.80,
        historicalPerformance: historicalScore,
      },
    },
    {
      title: "Initiate Emergency Air Freight for Critical Items",
      description: `For items with <3 days of supply (${criticalItem?.name ?? "critical SKU"}), authorize air freight shipment from ${bestAlternative?.name ?? "FastTrack Logistics"} to bypass ground transport delays. Air freight will deliver in 1 business day vs. ${delayDays}-day delay on ground transport.`,
      businessImpact: `Eliminates stockout risk for most critical items. Justifiable given production shutdown risk at customer facility (est. $50,000+/day downtime cost vs. $8,000 air freight premium).`,
      estimatedCost: `+$${Math.round(6000 + Math.random() * 4000).toLocaleString()} air freight premium (150% over standard ground)`,
      businessRules: [
        "Shipping SOP: Air freight escalation authorized when sea/ground ETA exceeds SLA by >48 hours",
        "Procurement Policy: expedited authorization granted for stockout risk <72 hours",
        "Escalation Procedures: Level 3 escalation for Platinum customer SLA breach imminent",
      ],
      reasoningTrace: [
        `${criticalItem?.name ?? "Critical SKU"}: ${daysOfSupply.toFixed(1)} days supply remaining`,
        `Supplier delay: ${delayDays} days. Supply gap: ${delayDays - daysOfSupply} days → production halt certain without intervention`,
        `Air freight reduces delivery time to 1 day, closing the supply gap`,
        `Shipping SOP §3.5 authorizes air freight for critical SLA items`,
        `Cost-benefit: $8,000 air freight premium vs. $50,000+/day production shutdown`,
      ],
      signals: {
        inventoryHealth: inventoryHealthScore(daysOfSupply, criticalItem?.safetyStock ?? 25, criticalItem?.avgDailyDemand ?? 6),
        slaUrgency: slaUrgencyScore(remainingHours - 12),
        supplierReliability: altReliability,
        leadTimeRisk: 0.15,
        weatherRisk: 0.1,
        costImpact: costImpactScore(2.5),
        historicalPerformance: historicalScore,
      },
    },
  ];
}

function buildInventoryShortageRecommendations(
  runId: string,
  inventoryItems: InventoryItem[],
  suppliers: Supplier[],
  orders: Order[],
  knowledgeChunks: RetrievedChunk[],
  historicalScore: number
): RecommendationPlan[] {
  const criticalItems = inventoryItems.filter((i) => i.daysOfSupply < 3);
  const atRisk = inventoryItems.filter((i) => i.daysOfSupply >= 3 && i.daysOfSupply < 7);
  const primary = criticalItems[0] ?? atRisk[0] ?? inventoryItems[0];
  const bestSupplier = suppliers.filter((s) => s.currentStatus === "active").sort((a, b) => a.avgLeadTimeDays - b.avgLeadTimeDays)[0];

  return [
    {
      title: "Emergency Inter-Warehouse Stock Transfer",
      description: `Transfer ${primary.name} from WH-003 (surplus: 40 days supply) to WH-001 (critical: ${primary.daysOfSupply.toFixed(1)} days). Transfer lead time: 1-2 business days, bridging the gap until replenishment arrives.`,
      businessImpact: `Prevents production halt at affected facility within 48 hours. Zero procurement cost — utilizes existing inventory assets.`,
      estimatedCost: `$${Math.round(primary.currentStock * 0.5 * 1.1).toLocaleString()} transfer logistics (est. $0.50/unit regional)`,
      businessRules: [
        "Warehouse Guidelines: transfers authorized when source >30 days, destination <7 days",
        "Escalation Procedures: Level 2 escalation for stockout risk within 7 days",
        "Inventory management: safety stock breach triggers immediate transfer review",
      ],
      reasoningTrace: [
        `Inventory analysis: ${primary.name} at ${primary.daysOfSupply.toFixed(1)} days supply — CRITICAL`,
        `Safety stock: ${primary.safetyStock} units. Current: ${primary.currentStock} units. Below threshold by ${primary.safetyStock - primary.currentStock} units`,
        `WH-003 carries surplus inventory of same SKU (>30 days supply)`,
        `Transfer time: 1-2 days, sufficient to prevent stockout at current demand rate`,
        `Warehouse Guidelines §3.2 authorizes emergency inter-warehouse transfer`,
      ],
      signals: {
        inventoryHealth: inventoryHealthScore(primary.daysOfSupply, primary.safetyStock, primary.avgDailyDemand),
        slaUrgency: 0.70,
        supplierReliability: 0.90,
        leadTimeRisk: 0.2,
        weatherRisk: 0.1,
        costImpact: 0.88,
        historicalPerformance: historicalScore,
      },
    },
    {
      title: `Emergency Procurement from ${bestSupplier?.name ?? "FastTrack Logistics"}`,
      description: `Issue emergency PO to ${bestSupplier?.name ?? "FastTrack Logistics"} for ${primary.name} at expedited lead time of ${bestSupplier?.avgLeadTimeDays ?? 1} day(s). Order quantity: ${Math.round(primary.avgDailyDemand * 30)} units (30-day supply). Cost index: ${bestSupplier?.costIndex.toFixed(2) ?? "1.22"}x standard rate.`,
      businessImpact: `Restores 30-day supply buffer and prevents recurrence. Eliminates ongoing stockout risk for current demand cycle.`,
      estimatedCost: `$${Math.round(primary.avgDailyDemand * 30 * primary.unitCost * (bestSupplier?.costIndex ?? 1.22)).toLocaleString()} (${Math.round(((bestSupplier?.costIndex ?? 1.22) - 1) * 100)}% premium)`,
      businessRules: [
        "Procurement Policy: emergency procurement authorized for stockout risk <72 hours",
        "Procurement Policy: Manager approval required for orders >$50,000",
        "Safety stock policy: minimum 7 days demand maintained for critical items",
      ],
      reasoningTrace: [
        `Current stock: ${primary.currentStock} units. Daily demand: ${primary.avgDailyDemand} units/day`,
        `Stockout in ${primary.daysOfSupply.toFixed(1)} days — below emergency threshold`,
        `${bestSupplier?.name ?? "FastTrack"} lead time: ${bestSupplier?.avgLeadTimeDays ?? 1} day(s) — can receive before stockout`,
        `Order quantity: 30-day supply = ${Math.round(primary.avgDailyDemand * 30)} units`,
        `Procurement Policy §2.3: emergency procurement authorized`,
      ],
      signals: {
        inventoryHealth: inventoryHealthScore(primary.daysOfSupply, primary.safetyStock, primary.avgDailyDemand),
        slaUrgency: 0.65,
        supplierReliability: bestSupplier?.reliabilityScore ?? 0.94,
        leadTimeRisk: leadTimeRiskScore(bestSupplier?.avgLeadTimeDays ?? 1, primary.daysOfSupply),
        weatherRisk: 0.15,
        costImpact: costImpactScore(bestSupplier?.costIndex ?? 1.22),
        historicalPerformance: historicalScore,
      },
    },
    {
      title: "Pause Active Promotions for Affected SKUs",
      description: `Temporarily suspend all marketing promotions driving demand for ${primary.name} until stock is replenished. Estimated demand reduction: 20-35% during promotional pause. Notify marketing and sales teams to realign campaigns.`,
      businessImpact: `Reduces demand by est. ${Math.round(primary.avgDailyDemand * 0.25)} units/day, extending supply from ${primary.daysOfSupply.toFixed(1)} to ${(primary.daysOfSupply * 1.3).toFixed(1)} days. Buys time for procurement to arrive.`,
      estimatedCost: "Opportunity cost: ~$${Math.round(primary.avgDailyDemand * 0.25 * primary.unitCost * 5).toLocaleString()} lost revenue over 5 days",
      businessRules: [
        "Inventory management: demand management tools available when stock < safety stock",
        "Escalation Procedures: cross-functional coordination required for SLA risk",
      ],
      reasoningTrace: [
        `Promotions driving elevated demand: ${primary.avgDailyDemand} units/day vs. baseline ~${Math.round(primary.avgDailyDemand * 0.75)} units/day`,
        `Pausing promotions reduces demand by ~25%, extending supply window`,
        `New supply arrival time: ${bestSupplier?.avgLeadTimeDays ?? 1} day(s) — pause gives buffer`,
        `Demand management is low-cost lever vs. emergency procurement`,
      ],
      signals: {
        inventoryHealth: 0.25,
        slaUrgency: 0.45,
        supplierReliability: 0.80,
        leadTimeRisk: 0.5,
        weatherRisk: 0.1,
        costImpact: 0.70,
        historicalPerformance: historicalScore,
      },
    },
  ];
}

function buildWeatherDisruptionRecommendations(
  runId: string,
  shipments: Shipment[],
  suppliers: Supplier[],
  knowledgeChunks: RetrievedChunk[],
  historicalScore: number
): RecommendationPlan[] {
  const affected = shipments.filter((s) => s.weatherRisk === "high");
  const primary = affected[0] ?? shipments[0];

  return [
    {
      title: "Reroute Shipments via Alternative Inland Routes",
      description: `Divert ${affected.length} weather-affected shipment(s) from Gulf Coast sea routes to inland ground freight via Dallas-Atlanta corridor. Rerouting adds 1-2 days transit time but avoids 72-96 hour port closure. Contact carrier FreightEx to initiate reroute within 2 hours.`,
      businessImpact: `Reduces delay from 72-96 hours (port closure) to 24-48 hours (alternate route). Protects delivery commitments for affected orders.`,
      estimatedCost: `+$${Math.round(3500 + Math.random() * 2000).toLocaleString()} rerouting surcharge per shipment`,
      businessRules: [
        "Shipping SOP: alternative routes pre-approved for Platinum customer shipments",
        "Shipping SOP: rerouting authorized for delays >24 hours affecting SLA",
        "Escalation Procedures: Level 2 — weather severity HIGH triggers manager approval",
      ],
      reasoningTrace: [
        `Weather Risk Agent detected: Hurricane Warning in Gulf Coast region`,
        `Port of Houston and Port of Galveston: 72-96 hour closure expected`,
        `${affected.length} shipment(s) on affected sea routes: ${affected.map((s) => s.shipmentId).join(", ")}`,
        `Alternative route: inland ground via Dallas-Atlanta adds 24 hours, avoids 72-96 hour closure`,
        `Shipping SOP §4.1 authorizes immediate rerouting for weather Severity Level 3`,
      ],
      signals: {
        inventoryHealth: 0.60,
        slaUrgency: 0.65,
        supplierReliability: 0.85,
        leadTimeRisk: 0.40,
        weatherRisk: weatherRiskScore("high"),
        costImpact: costImpactScore(1.35),
        historicalPerformance: historicalScore,
      },
    },
    {
      title: "Escalate Critical Shipments to Air Freight",
      description: `For shipment ${primary?.shipmentId ?? "SHP-001"} containing critical chemicals (value: $${primary?.totalValue?.toLocaleString() ?? "125,000"}), immediately authorize air freight diversion. Air freight will deliver within 24 hours vs. 5+ day sea freight delay. File customs documentation now to avoid clearance delays.`,
      businessImpact: `Ensures critical chemical shipment meets regulatory compliance deadline. Avoids $${Math.round((primary?.totalValue ?? 125000) * 0.15).toLocaleString()} regulatory penalty and production shutdown.`,
      estimatedCost: `+$${Math.round(8000 + Math.random() * 4000).toLocaleString()} air freight (150% premium, justified by ${primary?.totalValue?.toLocaleString() ?? "125,000"} cargo value)`,
      businessRules: [
        "Shipping SOP: air freight for critical items when weather ETA exceeds SLA by >48h",
        "Escalation Procedures: Level 3 escalation for compliance-critical shipments",
        "Procurement Policy: air freight authorized by Director for orders >$100,000",
      ],
      reasoningTrace: [
        `Shipment ${primary?.shipmentId}: contains regulatory-compliance items worth $${primary?.totalValue?.toLocaleString() ?? "125,000"}`,
        `Current ETA: ${primary?.currentEta ?? "delayed 5+ days"} — will miss compliance deadline`,
        `Air freight alternative: 24-hour delivery from nearest supplier`,
        `Penalty exposure: $${Math.round((primary?.totalValue ?? 125000) * 0.15).toLocaleString()} regulatory fine if delayed`,
        `Air freight cost ($12,000) < penalty exposure ($${Math.round((primary?.totalValue ?? 125000) * 0.15).toLocaleString()})`,
      ],
      signals: {
        inventoryHealth: 0.4,
        slaUrgency: 0.85,
        supplierReliability: 0.92,
        leadTimeRisk: 0.15,
        weatherRisk: weatherRiskScore("high"),
        costImpact: costImpactScore(2.5),
        historicalPerformance: historicalScore,
      },
    },
    {
      title: "Pre-Position Emergency Stock at Safe Warehouses",
      description: `Transfer 14-day supply of high-priority items from weather-affected WH-005 (Dallas, at risk) to WH-001 (Chicago) and WH-004 (Atlanta) as weather buffer stock. Complete transfers before storm landfall in 36 hours.`,
      businessImpact: `Creates geographic redundancy. If Dallas warehouse becomes inaccessible (flooding risk 35%), alternative fulfillment continues uninterrupted from Chicago and Atlanta.`,
      estimatedCost: `$${Math.round(4500 + Math.random() * 2000).toLocaleString()} pre-emptive transfer logistics`,
      businessRules: [
        "Shipping SOP: Severity Level 3 protocol — pre-position stock in safe locations",
        "Warehouse Guidelines: emergency transfers authorized for weather disruption",
        "Escalation Procedures: proactive Level 2 escalation for predicted disruption",
      ],
      reasoningTrace: [
        `WH-005 (Dallas) is in the storm's projected path — 35% flooding risk`,
        `14-day supply transfer creates buffer while affected warehouse is inaccessible`,
        `WH-001 (Chicago) and WH-004 (Atlanta) have available capacity`,
        `Transfer window: 36 hours before storm landfall — executable timeline`,
        `Shipping SOP §3.3 Level 3 protocol authorizes pre-positioning`,
      ],
      signals: {
        inventoryHealth: 0.55,
        slaUrgency: 0.50,
        supplierReliability: 0.85,
        leadTimeRisk: 0.3,
        weatherRisk: weatherRiskScore("high"),
        costImpact: costImpactScore(1.4),
        historicalPerformance: historicalScore,
      },
    },
  ];
}

function buildVipCustomerRecommendations(
  runId: string,
  orders: Order[],
  inventoryItems: InventoryItem[],
  suppliers: Supplier[],
  knowledgeChunks: RetrievedChunk[],
  historicalScore: number
): RecommendationPlan[] {
  const platinum = orders.find((o) => o.customerTier === "platinum") ?? orders[0];
  const criticalItems = inventoryItems.filter((i) => i.daysOfSupply < 7);
  const primary = criticalItems[0] ?? inventoryItems[0];

  return [
    {
      title: `Reserve Dedicated Stock for ${platinum?.customerName ?? "Platinum Customer"}`,
      description: `Immediately place a stock reservation lock on ${primary?.name ?? "required SKUs"} for ${platinum?.customerName ?? "Platinum customer"} order ${platinum?.orderId ?? "pending"}. Set allocation priority to PLATINUM_RESERVED in warehouse management system. Quantity: ${platinum?.items?.[0]?.quantity ?? 50} units reserved until delivery confirmation.`,
      businessImpact: `Guarantees fulfillment of $${platinum?.totalValue?.toLocaleString() ?? "62,500"} Platinum order with 99.5% SLA. Prevents allocation to lower-priority orders that could cause SLA breach.`,
      estimatedCost: "No additional cost — inventory reservation only",
      businessRules: [
        "Customer Priority Matrix: Platinum customers receive priority fulfillment and reserved stock allocation",
        "Customer Priority Matrix: Platinum SLA = 99.5% on-time delivery",
        "Escalation Procedures: any Platinum delay triggers immediate Level 3 escalation",
      ],
      reasoningTrace: [
        `Order ${platinum?.orderId}: Platinum customer ${platinum?.customerName}, value $${platinum?.totalValue?.toLocaleString()}`,
        `Required delivery: ${platinum?.requiredDelivery}. SLA: ${platinum?.slaHours ?? 24} hours`,
        `Customer Priority Matrix: Platinum tier has priority scoring weight 100 (vs Gold: 75, Silver: 50)`,
        `Stock reservation prevents allocation conflicts with lower-priority orders`,
        `Zero-cost action with immediate protective effect`,
      ],
      signals: {
        inventoryHealth: inventoryHealthScore(primary?.daysOfSupply ?? 2, primary?.safetyStock ?? 20, primary?.avgDailyDemand ?? 4),
        slaUrgency: slaUrgencyScore(platinum?.slaHours ?? 24),
        supplierReliability: 0.85,
        leadTimeRisk: 0.25,
        weatherRisk: 0.1,
        costImpact: 0.98,
        historicalPerformance: historicalScore,
      },
    },
    {
      title: `Priority Fulfillment Processing for ${platinum?.customerName ?? "Platinum Customer"}`,
      description: `Queue ${platinum?.orderId ?? "Platinum order"} at top of warehouse processing queue at WH-001. Assign dedicated pick-and-pack team, target same-day dispatch. Expedite quality control checks. Assign dedicated account manager to oversee delivery end-to-end.`,
      businessImpact: `Reduces fulfillment time from standard 48 hours to <12 hours. Demonstrates platinum-tier service commitment. Reduces SLA breach risk from 65% to <5%.`,
      estimatedCost: `$${Math.round(200 + Math.random() * 300).toLocaleString()} overtime staffing for priority processing`,
      businessRules: [
        "Customer Priority Matrix: Platinum customers have dedicated account manager and priority fulfillment",
        "Escalation Procedures: Platinum SLA risk triggers Level 3 escalation within 30 minutes",
        "Shipping SOP: priority dispatch within 2 hours of queue assignment",
      ],
      reasoningTrace: [
        `${platinum?.customerName ?? "Platinum customer"}: annual revenue category — highest priority tier`,
        `Standard processing time: 48 hours. SLA window: ${platinum?.slaHours ?? 24} hours. GAP: -${(48 - (platinum?.slaHours ?? 24))} hours`,
        `Priority processing reduces dispatch to <12 hours, meeting SLA window`,
        `Customer Priority Matrix §2.1: dedicated account manager required`,
        `Escalation Procedures Level 3: 30-minute response time`,
      ],
      signals: {
        inventoryHealth: 0.55,
        slaUrgency: slaUrgencyScore(platinum?.slaHours ?? 24),
        supplierReliability: 0.90,
        leadTimeRisk: 0.2,
        weatherRisk: 0.1,
        costImpact: 0.85,
        historicalPerformance: historicalScore,
      },
    },
    {
      title: "Escalate Procurement for Replenishment",
      description: `With current stock at ${primary?.daysOfSupply?.toFixed(1) ?? "2"} days and Platinum order consuming ${platinum?.items?.[0]?.quantity ?? 50} units, initiate emergency replenishment order to restore safety stock levels. Target: 30-day buffer post-fulfillment.`,
      businessImpact: `Prevents future Platinum SLA risks. Restores inventory health from CRITICAL to HEALTHY within 5 business days.`,
      estimatedCost: `$${Math.round((primary?.avgDailyDemand ?? 4) * 30 * (primary?.unitCost ?? 1250) * 1.15).toLocaleString()} expedited replenishment order`,
      businessRules: [
        "Procurement Policy: emergency procurement when stockout risk < 72 hours",
        "Inventory management: safety stock = minimum 7 days demand for critical items",
        "Vendor SLA: Tier 1 suppliers guarantee 2-day expedited delivery",
      ],
      reasoningTrace: [
        `Post-fulfillment stock: ${Math.max(0, (primary?.currentStock ?? 0) - (platinum?.items?.[0]?.quantity ?? 50))} units remaining`,
        `At daily demand of ${primary?.avgDailyDemand ?? 4} units: ${Math.max(0, ((primary?.currentStock ?? 0) - (platinum?.items?.[0]?.quantity ?? 50)) / (primary?.avgDailyDemand ?? 4)).toFixed(1)} days until next stockout`,
        `Safety stock requirement: ${primary?.safetyStock ?? 20} units. Currently BELOW threshold`,
        `Emergency procurement from Tier 1 supplier: 2-day lead time`,
        `30-day replenishment quantity: ${(primary?.avgDailyDemand ?? 4) * 30} units at $${(primary?.unitCost ?? 1250).toFixed(2)}/unit`,
      ],
      signals: {
        inventoryHealth: inventoryHealthScore(primary?.daysOfSupply ?? 2, primary?.safetyStock ?? 20, primary?.avgDailyDemand ?? 4),
        slaUrgency: 0.60,
        supplierReliability: 0.88,
        leadTimeRisk: leadTimeRiskScore(2, primary?.daysOfSupply ?? 2),
        weatherRisk: 0.1,
        costImpact: costImpactScore(1.15),
        historicalPerformance: historicalScore,
      },
    },
  ];
}

export interface RunRecommendationAgentInput {
  runId: string;
  scenarioType: string;
  input: string;
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  shipments: Shipment[];
  orders: Order[];
  knowledgeChunks: RetrievedChunk[];
  historicalScore: number;
}

export async function runRecommendationAgent(params: RunRecommendationAgentInput): Promise<{ agentResult: AgentResult; recommendations: RecommendationOutput[] }> {
  const start = new Date();
  await delay(420);

  let plans: RecommendationPlan[];

  switch (params.scenarioType) {
    case "vendor_delay":
      plans = buildVendorDelayRecommendations(params.runId, params.suppliers, params.inventoryItems, params.orders, params.knowledgeChunks, params.historicalScore);
      break;
    case "inventory_shortage":
      plans = buildInventoryShortageRecommendations(params.runId, params.inventoryItems, params.suppliers, params.orders, params.knowledgeChunks, params.historicalScore);
      break;
    case "weather_disruption":
      plans = buildWeatherDisruptionRecommendations(params.runId, params.shipments, params.suppliers, params.knowledgeChunks, params.historicalScore);
      break;
    case "vip_customer_order":
      plans = buildVipCustomerRecommendations(params.runId, params.orders, params.inventoryItems, params.suppliers, params.knowledgeChunks, params.historicalScore);
      break;
    default:
      plans = buildVendorDelayRecommendations(params.runId, params.suppliers, params.inventoryItems, params.orders, params.knowledgeChunks, params.historicalScore);
  }

  const recommendations: RecommendationOutput[] = plans.map((plan, idx) => {
    const { overallScore, breakdown, priority } = computeConfidence(plan.signals);
    const evidence = [
      ...buildEvidenceFromChunks(params.knowledgeChunks, 2),
    ];
    if (params.inventoryItems.length > 0) {
      const criticalItem = params.inventoryItems.find((i) => i.daysOfSupply < 5) ?? params.inventoryItems[0];
      evidence.push(dataSignal("Inventory Report", `${criticalItem.name}: ${criticalItem.daysOfSupply.toFixed(1)} days of supply, safety stock: ${criticalItem.safetyStock} units`));
    }
    if (params.suppliers.length > 0) {
      const primary = params.suppliers.find((s) => s.currentStatus === "delayed") ?? params.suppliers[0];
      evidence.push(dataSignal("Supplier Data", `${primary.name}: reliability ${Math.round(primary.reliabilityScore * 100)}%, current status: ${primary.currentStatus}`));
    }

    return {
      id: uuidv4(),
      runId: params.runId,
      title: plan.title,
      description: plan.description,
      priority,
      confidenceScore: overallScore,
      businessImpact: plan.businessImpact,
      estimatedCost: plan.estimatedCost,
      status: "pending",
      evidence: evidence.slice(0, 5),
      reasoningTrace: plan.reasoningTrace,
      confidenceBreakdown: breakdown,
      businessRules: plan.businessRules,
      userFeedback: null,
      modifiedDescription: null,
      rank: idx + 1,
    };
  });

  // Sort by confidence descending, update rank
  recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);
  recommendations.forEach((r, i) => { r.rank = i + 1; });

  const end = new Date();
  return {
    agentResult: {
      agentId: "recommendation",
      agentName: "Recommendation Agent",
      status: "completed",
      startTime: start,
      endTime: end,
      durationMs: end.getTime() - start.getTime(),
      outputSummary: `Generated ${recommendations.length} ranked recommendations. Top confidence: ${recommendations[0]?.confidenceScore ?? 0}%.`,
      insights: recommendations.map((r) => `[${r.priority.toUpperCase()}] ${r.title}: ${r.confidenceScore}% confidence`),
      dataPoints: { count: recommendations.length, topConfidence: recommendations[0]?.confidenceScore ?? 0 },
    },
    recommendations,
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
