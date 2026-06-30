import { Router, type IRouter } from "express";

const router: IRouter = Router();

const AGENT_REGISTRY = [
  {
    id: "planner",
    name: "Planner Agent",
    description: "Orchestrates the entire agent pipeline. Analyzes the business scenario, classifies the problem type, selects only relevant specialized agents, and merges their outputs into a unified reasoning context.",
    capabilities: ["Scenario classification", "Dynamic agent selection", "Multi-agent orchestration", "Result aggregation", "Reasoning trace generation"],
    dataSources: ["Scenario input", "Agent results", "Historical performance"],
    outputTypes: ["Agent execution plan", "Reasoning trace", "Orchestration timeline"],
  },
  {
    id: "inventory",
    name: "Inventory Agent",
    description: "Reads and analyzes inventory data across all warehouses. Computes health scores, identifies shortage risks, detects overstock, and evaluates transfer opportunities.",
    capabilities: ["Inventory health scoring", "Shortage risk detection", "Safety stock analysis", "Inter-warehouse transfer evaluation", "Days-of-supply computation"],
    dataSources: ["Inventory CSV", "Warehouse data", "Safety stock thresholds"],
    outputTypes: ["Inventory health report", "Critical items list", "Transfer recommendations"],
  },
  {
    id: "logistics",
    name: "Logistics Agent",
    description: "Monitors active shipments, evaluates transit delays, assesses carrier performance, and identifies rerouting opportunities. Integrates with real-time tracking data.",
    capabilities: ["Shipment status monitoring", "ETA analysis", "Delay detection", "Carrier performance evaluation", "Reroute recommendation"],
    dataSources: ["Shipment tracking data", "Carrier APIs", "Route information"],
    outputTypes: ["Delivery risk assessment", "ETA updates", "Shipping recommendations"],
  },
  {
    id: "procurement",
    name: "Procurement Agent",
    description: "Evaluates supplier performance, identifies alternative vendors, computes lead times and cost deltas, and generates procurement options for emergency and standard sourcing.",
    capabilities: ["Supplier evaluation", "Alternative vendor identification", "Lead time analysis", "Cost delta computation", "Purchase order recommendations"],
    dataSources: ["Supplier database", "Contract data", "Historical vendor performance"],
    outputTypes: ["Supplier recommendations", "Procurement options", "Cost analysis"],
  },
  {
    id: "customer-impact",
    name: "Customer Impact Agent",
    description: "Assesses business impact of supply chain disruptions by customer tier. Quantifies SLA exposure, revenue at risk, and customer relationship risk for Platinum, Gold, Silver, and Bronze tiers.",
    capabilities: ["SLA urgency scoring", "Revenue risk quantification", "Customer tier analysis", "Business impact assessment", "Priority scoring"],
    dataSources: ["Order data", "Customer priority matrix", "SLA agreements"],
    outputTypes: ["Impact assessment", "Customer risk report", "Revenue exposure"],
  },
  {
    id: "weather-risk",
    name: "Weather Risk Agent",
    description: "Fetches and analyzes weather alerts affecting supply chain routes. Detects storms, port disruptions, and ground transport issues. Classifies severity and affected corridors.",
    capabilities: ["Weather alert monitoring", "Severity classification", "Route impact assessment", "Port disruption detection", "Clearance time estimation"],
    dataSources: ["Weather API", "Route database", "Port status feeds"],
    outputTypes: ["Weather impact report", "Affected route list", "Risk severity rating"],
  },
  {
    id: "knowledge-retrieval",
    name: "Knowledge Retrieval Agent",
    description: "Searches enterprise knowledge base using TF-IDF and cosine similarity. Retrieves relevant policy documents, SOPs, and contracts to support reasoning and recommendations.",
    capabilities: ["TF-IDF document indexing", "Cosine similarity search", "Multi-query retrieval", "Document chunking", "Relevance scoring"],
    dataSources: ["Procurement Policy", "Vendor SLA", "Shipping SOP", "Warehouse Guidelines", "Escalation Procedures", "Customer Priority Matrix"],
    outputTypes: ["Retrieved knowledge chunks", "Similarity scores", "Policy citations"],
  },
  {
    id: "recommendation",
    name: "Recommendation Agent",
    description: "Generates ranked Next Best Actions using deterministic multi-factor reasoning. Computes confidence scores as a weighted function of 7 business signals. Every recommendation includes evidence, reasoning trace, and confidence breakdown.",
    capabilities: ["Multi-factor confidence scoring", "Evidence aggregation", "Business impact estimation", "Cost analysis", "Priority classification"],
    dataSources: ["All agent outputs", "Knowledge base", "Historical decisions", "Business rules"],
    outputTypes: ["Ranked recommendations", "Confidence breakdown", "Evidence panel", "Reasoning trace"],
  },
  {
    id: "memory",
    name: "Memory Agent",
    description: "Stores and retrieves historical decisions, approved/rejected actions, vendor performance trends, and incident patterns. Future recommendations are weighted by historical outcomes.",
    capabilities: ["Decision persistence", "Vendor performance tracking", "Historical pattern analysis", "Approval rate computation", "Context-aware weighting"],
    dataSources: ["Decision history", "Vendor performance logs", "Approval outcomes", "User feedback"],
    outputTypes: ["Historical performance score", "Vendor reliability trends", "Decision context"],
  },
];

router.get("/agents", (_req, res): Promise<void> => {
  res.json(AGENT_REGISTRY);
  return Promise.resolve();
});

export default router;
