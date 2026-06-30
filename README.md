# Supply Pilot

## Team details
- Team: Supply Pilot
- Members:
  1. Deekshitha Reddy Potu - 23071A3216 - CSBS
  2. Prashamsa Reddy - 23071A3235 - CSBS
  3. Nithya Pranavi - 23071A3261 - CSBS
- Role: Full-stack AI-enabled supply chain assistant

## Project overview
Supply Pilot is an AI-assisted supply chain management platform designed to help organizations monitor inventory, manage orders, coordinate shipments, track suppliers, and evaluate warehouse performance.

Key capabilities:
- Decision history & memory tracking: store and review AI-assisted recommendations, approvals, and vendor performance over time.
- Scenario simulation: run what-if workflows and explore outcomes for procurement, shipping, and inventory changes.
- Knowledge and reasoning support: surface internal policies, SOPs, and best-practice guidance for supply chain decision-making.
- Real-time dashboards: display KPIs, approval rates, incident history, and performance metrics in a polished React interface.

Architecture overview:
- `artifacts/api-server`
  - Backend API built with `Express` and TypeScript.
  - Provides routes for memory, recommendations, knowledge, and scenario execution.
  - Uses `drizzle-orm` and workspace-shared data models for in-memory data and business logic.
- `artifacts/supply-pilot`
  - Main user-facing React/Vite application.
  - Implements dashboards, memory panels, knowledge search, scenario runners, and run detail views.
  - Uses `@tanstack/react-query` for server state management and incremental client rendering.
- `artifacts/mockup-sandbox`
  - Supplemental front-end sandbox for UI mockups and previewing component layouts.
  - Useful for experimentation and design validation without impacting the main app.
- Shared libraries
  - `lib/api-client-react` provides type-safe API hooks and generated client bindings.
  - `lib/api-zod` contains schema definitions and validation logic.
  - `lib/db` defines database schema and shared data structures for the workspace.

This monorepo is configured for cross-package development, enabling shared types and coordinated builds across backend and frontend modules.

## GitHub repository link
- Current repository remote: `git://gitsafe:5418/backup.git`
- Public GitHub repo: `https://github.com/Nithya4115/Supply-Pilot`

## Setup instructions
1. Install Node.js (tested with Node 22)
2. Use Corepack to run pnpm:
   ```bash
   corepack pnpm install
   ```
3. Build the workspace:
   ```bash
   corepack pnpm run build
   ```
4. Start the API server:
   ```bash
   corepack pnpm --dir artifacts/api-server run dev
   ```
5. Start the front-end app(s):
   ```bash
   corepack pnpm --dir artifacts/supply-pilot run dev
   ```

> If `pnpm` is installed globally, you can replace `corepack pnpm` with `pnpm`.

## Additional notes
- The repository required cross-platform fixes for Windows, including a Node-based `preinstall` script and environment defaults for Vite config.
- The project build was verified successfully with `corepack pnpm run build`.
- Update the team details and GitHub repository link once the official repo is available.
