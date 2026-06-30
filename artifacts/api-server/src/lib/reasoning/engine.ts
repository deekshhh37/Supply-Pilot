export interface ReasoningSignals {
  inventoryHealth: number;       // 0-1: 1 = healthy, 0 = critical stockout
  slaUrgency: number;            // 0-1: 1 = breach imminent, 0 = plenty of time
  supplierReliability: number;   // 0-1: supplier's reliability score
  leadTimeRisk: number;          // 0-1: 1 = very long lead time risk, 0 = quick lead time
  weatherRisk: number;           // 0-1: 1 = severe weather, 0 = clear
  costImpact: number;            // 0-1: 1 = low cost delta, 0 = very expensive
  historicalPerformance: number; // 0-1: based on past decisions
}

export interface ConfidenceFactor {
  factor: string;
  score: number;
  weight: number;
  contribution: number;
  description: string;
}

export interface ConfidenceResult {
  overallScore: number;
  breakdown: ConfidenceFactor[];
  priority: "critical" | "high" | "medium" | "low";
}

const WEIGHTS = {
  inventoryHealth: 0.25,
  slaUrgency: 0.20,
  supplierReliability: 0.20,
  leadTimeRisk: 0.15,
  weatherRisk: 0.10,
  costImpact: 0.05,
  historicalPerformance: 0.05,
};

const FACTOR_LABELS: Record<keyof ReasoningSignals, string> = {
  inventoryHealth: "Inventory Health",
  slaUrgency: "SLA Urgency",
  supplierReliability: "Supplier Reliability",
  leadTimeRisk: "Lead Time Risk",
  weatherRisk: "Weather Risk",
  costImpact: "Cost Impact",
  historicalPerformance: "Historical Performance",
};

function scoreDescription(factor: keyof ReasoningSignals, score: number): string {
  if (factor === "inventoryHealth") {
    if (score < 0.2) return `Critical: <3 days of supply remaining`;
    if (score < 0.4) return `At-risk: 3-7 days of supply, below safety stock`;
    if (score < 0.6) return `Watch: 7-14 days of supply, approaching safety stock`;
    return `Healthy: >14 days of supply`;
  }
  if (factor === "slaUrgency") {
    if (score > 0.8) return `Breach imminent: customer SLA at immediate risk`;
    if (score > 0.5) return `High urgency: SLA breach within 24-48 hours`;
    if (score > 0.2) return `Moderate urgency: SLA breach risk within 72 hours`;
    return `Low urgency: SLA window comfortable`;
  }
  if (factor === "supplierReliability") {
    if (score > 0.9) return `Excellent: ${Math.round(score * 100)}% on-time delivery rate`;
    if (score > 0.75) return `Good: ${Math.round(score * 100)}% on-time delivery rate`;
    if (score > 0.6) return `Marginal: ${Math.round(score * 100)}% reliability, on probation`;
    return `Poor: ${Math.round(score * 100)}% reliability, high-risk vendor`;
  }
  if (factor === "leadTimeRisk") {
    if (score > 0.7) return `High risk: lead time exceeds days of supply`;
    if (score > 0.4) return `Moderate risk: lead time close to stock depletion`;
    return `Low risk: sufficient lead time buffer`;
  }
  if (factor === "weatherRisk") {
    if (score > 0.7) return `Severe: active weather disruption affecting routes`;
    if (score > 0.4) return `Moderate: weather alerts in transit corridor`;
    return `Low: no significant weather disruptions`;
  }
  if (factor === "costImpact") {
    if (score > 0.7) return `Low cost delta: action cost-effective`;
    if (score > 0.4) return `Moderate cost: 15-30% premium above standard`;
    return `High cost: significant premium required`;
  }
  return `Score: ${Math.round(score * 100)}%`;
}

export function computeConfidence(signals: ReasoningSignals): ConfidenceResult {
  const breakdown: ConfidenceFactor[] = (
    Object.entries(WEIGHTS) as [keyof ReasoningSignals, number][]
  ).map(([factor, weight]) => {
    const score = Math.min(1, Math.max(0, signals[factor]));
    const contribution = score * weight;
    return {
      factor: FACTOR_LABELS[factor],
      score: Math.round(score * 100) / 100,
      weight,
      contribution: Math.round(contribution * 100) / 100,
      description: scoreDescription(factor, score),
    };
  });

  const overallRaw = breakdown.reduce((sum, b) => sum + b.contribution, 0);
  const overallScore = Math.min(99, Math.max(10, Math.round(overallRaw * 100)));

  let priority: "critical" | "high" | "medium" | "low";
  if (signals.slaUrgency > 0.7 || signals.inventoryHealth < 0.2) {
    priority = "critical";
  } else if (signals.slaUrgency > 0.4 || signals.inventoryHealth < 0.4) {
    priority = "high";
  } else if (signals.slaUrgency > 0.2 || signals.inventoryHealth < 0.6) {
    priority = "medium";
  } else {
    priority = "low";
  }

  return { overallScore, breakdown, priority };
}

export function inventoryHealthScore(daysOfSupply: number, safetyStock: number, avgDailyDemand: number): number {
  const safetyDays = avgDailyDemand > 0 ? safetyStock / avgDailyDemand : 7;
  if (daysOfSupply < 2) return 0.05;
  if (daysOfSupply < 3) return 0.15;
  if (daysOfSupply < safetyDays * 0.5) return 0.25;
  if (daysOfSupply < safetyDays) return 0.45;
  if (daysOfSupply < safetyDays * 2) return 0.70;
  if (daysOfSupply < safetyDays * 4) return 0.85;
  return 0.95;
}

export function slaUrgencyScore(remainingHours: number): number {
  if (remainingHours < 0) return 1.0;
  if (remainingHours < 12) return 0.92;
  if (remainingHours < 24) return 0.80;
  if (remainingHours < 48) return 0.60;
  if (remainingHours < 72) return 0.35;
  if (remainingHours < 120) return 0.15;
  return 0.05;
}

export function leadTimeRiskScore(leadTimeDays: number, daysOfSupply: number): number {
  const ratio = leadTimeDays / Math.max(daysOfSupply, 0.5);
  if (ratio > 3) return 0.95;
  if (ratio > 2) return 0.80;
  if (ratio > 1.5) return 0.65;
  if (ratio > 1.0) return 0.50;
  if (ratio > 0.7) return 0.30;
  return 0.10;
}

export function weatherRiskScore(severity: string): number {
  switch (severity) {
    case "critical": return 0.95;
    case "high": return 0.80;
    case "moderate": return 0.55;
    case "low": return 0.20;
    default: return 0.05;
  }
}

export function costImpactScore(costMultiplier: number): number {
  // Higher score = lower cost impact (recommendation is more cost-effective)
  if (costMultiplier <= 1.05) return 0.95;
  if (costMultiplier <= 1.15) return 0.80;
  if (costMultiplier <= 1.30) return 0.60;
  if (costMultiplier <= 1.50) return 0.40;
  if (costMultiplier <= 1.70) return 0.20;
  return 0.05;
}
