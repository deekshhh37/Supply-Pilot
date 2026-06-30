---
name: SupplyPilot AI Architecture
description: Key architectural decisions and file locations for the SupplyPilot AI hackathon app
---

# SupplyPilot AI Architecture

## Stack
- API: Express 5 at `/api` (port 8080), artifact at `artifacts/api-server/`
- Frontend: React+Vite at `/` (port 24087), artifact at `artifacts/supply-pilot/`
- DB: PostgreSQL + Drizzle ORM, tables: scenario_runs, recommendations, memory_entries, vendor_performance
- Knowledge: 6 markdown files in `artifacts/api-server/data/knowledge/`
- Data: JSON files in `artifacts/api-server/data/` (inventory, suppliers, shipments, orders, warehouses)

## Key Rules
- After writing new DB schema, run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck`
- All Express routes use `Promise<void>` return type and `req.log` for logging (no console.log)
- uuid package installed in api-server (not in workspace catalog)
- Knowledge base initialized lazily on first use via `initKnowledgeBase()`

## Agent Pipeline Flow
- POST /api/scenarios/runs → runPlanner() → selects agents based on scenarioType → runs agents sequentially → persists run + recommendations to DB

**Why:** Each agent is purely functional (reads data files, returns insights). The planner orchestrates sequentially for simplicity/debuggability. Parallel would complicate the execution timeline UX.
