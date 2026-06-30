import { searchKnowledge, type RetrievedChunk } from "../rag/knowledge-base.js";
import type { AgentResult, AgentContext } from "./types.js";

const SCENARIO_QUERIES: Record<string, string[]> = {
  vendor_delay: [
    "vendor delay escalation supplier SLA breach notification",
    "alternative supplier emergency procurement authorization",
    "split shipment partial delivery customer notification",
  ],
  inventory_shortage: [
    "stockout inventory shortage safety stock emergency procurement",
    "warehouse transfer stock redistribution reorder",
    "inventory health critical at-risk reorder point",
  ],
  weather_disruption: [
    "weather disruption hurricane port closure shipping reroute",
    "air freight escalation weather severity alternative route",
    "weather risk shipment delay protocol",
  ],
  vip_customer_order: [
    "platinum customer priority SLA fulfillment reserve stock",
    "customer tier escalation priority matrix VIP fulfillment",
    "customer SLA breach platinum gold penalty",
  ],
  custom: [
    "supply chain disruption risk management escalation",
    "procurement vendor supplier reliability performance",
  ],
};

export interface KnowledgeRetrievalResult {
  chunks: RetrievedChunk[];
  agentResult: AgentResult;
}

export async function runKnowledgeRetrievalAgent(ctx: AgentContext): Promise<KnowledgeRetrievalResult> {
  const start = new Date();
  await delay(340);

  const queries = SCENARIO_QUERIES[ctx.scenarioType] ?? SCENARIO_QUERIES.custom;
  const allChunks: RetrievedChunk[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const results = searchKnowledge(query, 3);
    for (const r of results) {
      if (!seen.has(r.id) && r.similarityScore > 0.01) {
        seen.add(r.id);
        allChunks.push(r);
      }
    }
  }

  allChunks.sort((a, b) => b.similarityScore - a.similarityScore);
  const topChunks = allChunks.slice(0, 6);

  const insights: string[] = topChunks.map(
    (c) => `Retrieved: ${c.title} (similarity: ${c.similarityScore.toFixed(3)}) — "${c.content.substring(0, 120)}..."`
  );

  if (topChunks.length === 0) {
    insights.push("No relevant knowledge base documents found for this scenario");
  }

  const end = new Date();
  return {
    chunks: topChunks,
    agentResult: {
      agentId: "knowledge-retrieval",
      agentName: "Knowledge Retrieval Agent",
      status: "completed",
      startTime: start,
      endTime: end,
      durationMs: end.getTime() - start.getTime(),
      outputSummary: `Retrieved ${topChunks.length} relevant knowledge chunks from ${new Set(topChunks.map((c) => c.source)).size} documents using TF-IDF cosine similarity.`,
      insights,
      dataPoints: { chunks: topChunks, queriesRun: queries.length },
    },
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
