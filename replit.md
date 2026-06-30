# SupplyPilot AI

Agentic Decision Intelligence Platform for supply chain operations. 9 specialized AI agents analyze disruptions and generate ranked, evidence-backed recommendations with deterministic confidence scores — no LLM required.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 at `/api` (port 8080)
- Frontend: React + Vite at `/` (port 24087)
- DB: PostgreSQL + Drizzle ORM (4 tables: scenario_runs, recommendations, memory_entries, vendor_performance)
- Knowledge RAG: TF-IDF cosine similarity (no LLM dependency)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas for server validation
- `lib/db/src/schema/` — Drizzle table definitions (scenario-runs, recommendations, memory-entries, vendor-performance)
- `artifacts/api-server/src/lib/agents/` — 9 agent implementations (planner, inventory, logistics, procurement, customer-impact, weather-risk, knowledge-retrieval, recommendation, memory)
- `artifacts/api-server/src/lib/rag/` — TF-IDF index + knowledge base loader
- `artifacts/api-server/src/lib/reasoning/engine.ts` — deterministic 7-factor confidence scoring
- `artifacts/api-server/data/knowledge/` — 6 policy/SOP markdown files indexed by TF-IDF
- `artifacts/api-server/data/` — inventory.json, suppliers.json, shipments.json, orders.json, warehouses.json
- `artifacts/supply-pilot/src/pages/` — Dashboard, ScenarioRunner, RunDetail, Memory, Knowledge, Agents

## Architecture decisions

- **No LLM required**: TF-IDF + cosine similarity replaces embeddings for knowledge retrieval. Deterministic, fast, no API key dependency.
- **7-factor confidence scoring**: Each recommendation's confidence is a weighted sum of inventory health, SLA urgency, supplier reliability, lead time risk, weather risk, cost impact, and historical performance.
- **Synchronous pipeline**: Agents run sequentially (not parallel) so the execution timeline is deterministic and the UI can animate each step accurately.
- **JSONB for run data**: Agent timelines and recommendations stored as JSONB in scenario_runs for flexibility, with a separate recommendations table for status mutations.
- **Contract-first API**: OpenAPI spec drives codegen for both React Query hooks (frontend) and Zod schemas (backend validation).

## Product

- **Scenario Runner**: 4 predefined scenarios (Vendor Delay, Inventory Shortage, Weather Disruption, VIP Customer Order). Select a scenario, edit the input, and execute the 9-agent pipeline. Animated execution timeline shows each agent's status in real time.
- **Run Detail**: Full planner reasoning, expandable agent timeline with per-agent insights, ranked recommendation cards with confidence breakdown bars, evidence panel, and approve/reject/modify human-in-the-loop actions.
- **Memory Panel**: Persistent decision history stored in PostgreSQL. Vendor performance tracking updated on each action. Approval rate computed from historical decisions.
- **Knowledge Base**: 6 enterprise policy documents (Procurement Policy, Vendor SLA, Shipping SOP, Warehouse Guidelines, Escalation Procedures, Customer Priority Matrix) indexed and searchable via TF-IDF.
- **Agent Registry**: Capabilities, data sources, and live invocation stats for all 9 agents.

## Gotchas

- After adding new DB schema tables, run `pnpm run typecheck:libs` first, THEN `pnpm --filter @workspace/api-server run typecheck`. The api-server imports @workspace/db which needs its `.d.ts` rebuilt via `tsc --build`.
- uuid is installed directly in `@workspace/api-server` (not in pnpm-workspace.yaml catalog).
- Knowledge base path is resolved relative to cwd — works in both dev (run from workspace root) and production.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
