---
name: TF-IDF RAG Pattern
description: How knowledge retrieval works without an LLM - TF-IDF cosine similarity
---

# TF-IDF RAG Pattern

## Implementation
- `artifacts/api-server/src/lib/rag/tfidf.ts` — pure TF-IDF index with cosine similarity
- `artifacts/api-server/src/lib/rag/knowledge-base.ts` — loads markdown files, chunks by paragraph, indexes with TF-IDF
- Knowledge base is initialized lazily (singleton pattern) via `initKnowledgeBase()`

## Key Decision: No LLM Required
Using TF-IDF + cosine similarity instead of embeddings/LLM because:
1. User didn't provide a Gemini API key
2. Deterministic — same query always returns same results
3. Fast — no network latency
4. Demonstrates RAG architecture without dependency on external service

**Why:** For a hackathon demo, deterministic behavior is actually a feature — easier to reason about and debug.

## Lib Declaration Rebuild Pattern
After writing new DB schema tables, run `pnpm run typecheck:libs` first.
The api-server leaf artifact imports from @workspace/db, which needs its .d.ts rebuilt via tsc --build before the leaf typecheck can see new exports.
