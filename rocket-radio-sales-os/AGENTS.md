# AGENTS.md

## Project
Rocket Radio Sales OS

## Goal
Build a modular, multi‑tenant SaaS for radio and local media sales teams. The system should ingest client business goals and output ready‑to‑sell campaigns, proposals, creative assets, fulfilment tasks and performance reports using a provider‑agnostic AI layer.

---

## Stack
- Next.js
- TypeScript
- Vitest & React Testing Library
- Node.js
- PostgreSQL (or similar) for multi‑tenant data
- Vercel for deployment

---

## Commands

install: `npm install`  
dev: `npm run dev`  
build: `npm run build`  
lint: `npm run lint`  
test: `npm run test`  
typecheck: `npm run typecheck`  
verify: `npm run verify`

---

## Global Rules

1. **Single AI Entry Point** – All AI functions must call `generateContent()` in `src/ai/generateContent.ts`. Do not call providers directly in UI or API routes.
2. **Provider Isolation** – Keep model‑specific logic in `src/ai/providers/`.
3. **No UI/AI Mixing** – UI components never call AI directly.
4. **Fail Loudly** – Throw typed errors on invalid input/output and surface them to the API layer.
5. **Test Everything** – Add or update tests for each behaviour change.
6. **Run Verification** – After each task, run `npm run verify` to ensure lint, type and tests all pass.
7. **No Duplicate Exports** – Use `scripts/verify-no-duplicates.mjs` to detect duplicates.
8. **Small Tasks** – Write small, incremental tasks with clear acceptance criteria.
9. **Explicit TODOs** – Document uncertainties with TODO comments and summarise them in the task report.
10. **Multi‑Tenant Awareness** – Code must consider organisation, station and client scopes.

---

## Multi‑Agent Workflow

### Roles

#### Orchestrator
- Owns architecture and roadmap
- Decomposes work into tasks for other agents
- Reviews diffs and coordinates merges
- Maintains `AGENTS.md`, architecture and product docs

#### Core Agent (Backend)
- Sets up auth, user management, organisations, stations, clients and campaigns
- Designs database schema with tenant isolation
- Implements APIs for proposals, creative assets and reports

#### AI Agent
- Implements `generateContent()` and sub‑modes (briefs, scripts, proposals, reports, renewals)
- Defines prompt templates, evaluation hooks and provider adapters
- Adds brand and station profile data models

#### UI Agent
- Builds Next.js pages and components (dashboard, intake forms, proposal builder, report viewer)
- Implements loading, error and success states
- Maintains state hooks

#### QA Agent
- Adds and updates tests (unit, integration, end‑to‑end)
- Sets up CI workflows and deployment smoke tests
- Validates performance and regression behaviour

### Merge Standards
- Tasks must include a summary, list of changed files, commands run, test results and remaining risks.
- Only Orchestrator decides the merge order.
- QA Agent reviews changes before production deploy.

### Task Template
Each task should follow this format:

```
Task: descriptive title
Objective: what problem are we solving?
Scope: which layers / files can change?
Files allowed: explicit list (e.g. src/ai/**)
Files blocked: where changes are prohibited
Acceptance criteria: conditions to mark task complete
Commands to run: which npm scripts and tests
Expected output: description of deliverable
Risks / notes: known limitations or open questions
```

---

## Definition of Done

- `npm run build` passes
- `npm run lint` passes
- `npm run typecheck` passes
- `npm run test` passes
- No duplicate exported symbols
- API routes validate and report errors properly
- UI displays loading, success and error states
- Data flows are tenant‑aware

For more detail on product, architecture and tasks, see the `docs` folder.