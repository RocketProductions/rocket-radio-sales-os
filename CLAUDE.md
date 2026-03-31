# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Rocket Radio Sales OS — a multi-tenant SaaS for radio/local media sales teams. Turns business objectives into broadcast and digital campaigns, proposals, creative assets and reports using generative AI. Built with Next.js 16, React 19, TypeScript, and Vitest.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (all tests)
npx vitest run tests/ai/generateContent.test.ts  # Single test file
npm run verify       # lint + typecheck + test + duplicate-export check
```

Always run `npm run verify` after making changes.

## Architecture

### AI Layer (src/ai/)
All AI calls go through a single entry point: `src/ai/generateContent.ts` → `generateContent()`. Never call providers directly from UI or API routes. Provider-specific logic lives in `src/ai/providers/` (currently OpenAI). Input/output validated with Zod schemas in `src/ai/schemas/`.

### API Routes (src/app/api/)
- `api/generate/route.ts` — content generation endpoint (calls generateContent)
- `api/auth/login/route.ts` and `api/auth/signup/route.ts` — JWT auth with bcryptjs/jose

### Auth (src/lib/)
- `auth.ts` — password hashing (bcryptjs) and JWT signing/verification (jose). Requires `JWT_SECRET` env var.
- `db.ts` — in-memory user store (placeholder for future PostgreSQL)

### Types (src/types/content.ts)
Shared types for content generation (`GenerateContentInput`, `GenerateContentResult`), `User`, and `AuthPayload`. Multi-tenant: entities carry `tenantId`.

### UI (src/components/)
`ContentForm.tsx` and `OutputPreview.tsx` use state from `src/state/useContentState.ts`. Components never call AI directly.

### Tests (tests/)
Vitest with jsdom environment and React Testing Library. Setup file at `tests/setup.ts`. Path alias `@/` maps to `src/`.

## Key Rules

1. **Single AI entry point** — all AI goes through `generateContent()`, never providers directly
2. **Provider isolation** — model-specific code stays in `src/ai/providers/`
3. **No UI/AI mixing** — components call API routes, not AI functions
4. **Multi-tenant awareness** — respect organisation/station/client scopes and tenantId
5. **No duplicate exports** — `scripts/verify-no-duplicates.mjs` enforces this

## Environment Variables

See `.env.example`: `OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_URL`. Auth also requires `JWT_SECRET`.

## Path Alias

`@/*` maps to `src/*` (configured in both tsconfig.json and vitest.config.ts).
