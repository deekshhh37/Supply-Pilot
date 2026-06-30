import { Router, type IRouter } from "express";
import { initKnowledgeBase, getKnowledgeSources, searchKnowledge } from "../lib/rag/knowledge-base.js";
import { SearchKnowledgeBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/knowledge/sources", (_req, res): Promise<void> => {
  initKnowledgeBase();
  const sources = getKnowledgeSources();
  res.json(sources);
  return Promise.resolve();
});

router.post("/knowledge/search", (req, res): Promise<void> => {
  const parsed = SearchKnowledgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return Promise.resolve();
  }

  initKnowledgeBase();
  const { query, topK = 5 } = parsed.data;
  const results = searchKnowledge(query, topK);
  res.json(results.map((r) => ({
    id: r.id,
    source: r.source,
    title: r.title,
    content: r.content,
    similarityScore: r.similarityScore,
    category: r.category,
  })));
  return Promise.resolve();
});

export default router;
