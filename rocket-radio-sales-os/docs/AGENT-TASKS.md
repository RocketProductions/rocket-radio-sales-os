# Agent Tasks for Rocket Radio Sales OS

This document enumerates suggested tasks for OpenAI Codex multi‑agent workflows. Each task is small, isolated and targeted at a single layer of the system. Use the provided template to define new tasks.

## Task Template

```
Task: A short imperative description (e.g. "Create intake form component")
Objective: The user or business problem being solved
Scope: Which directories or files are allowed to change
Files allowed: Glob patterns for changes
Files blocked: Glob patterns that must remain untouched
Acceptance criteria:
  - Condition 1
  - Condition 2
Commands to run:
  - npm run typecheck
  - npm run test
Expected output: Describe the deliverable (e.g. a React component rendering a form)
Risks / notes: Caveats, uncertainties, dependencies
```

## Phase 1: Foundation

### Backend Scaffold
**Task:** Initialise database schema and auth.

- Set up migrations and ORM models for users, organizations, stations, clients and campaigns.
- Implement auth routes (sign‑up, login, invitations).
- Write unit tests for schema validations and auth logic.

### AI Scaffold
**Task:** Implement provider‑agnostic AI wrapper.

- Create `src/ai/generateContent.ts` with input/output schemas.
- Stub a provider in `src/ai/providers/openaiProvider.ts` returning deterministic data.
- Write tests for validation.

### UI Scaffold
**Task:** Build the dashboard shell and client intake form.

- Create a sidebar and top navigation.
- Build a multi‑step client intake wizard.
- Display the stub AI output in a preview component.

### QA Scaffold
**Task:** Add test harness and continuous integration.

- Set up Vitest config.
- Add example unit tests for each layer.
- Create a GitHub Actions workflow that runs linting, type checking and tests on each push.

## Phase 2: Core System

Define additional tasks for campaign builder, creative studio, proposal builder and reporting. Use the same template and restrictions to ensure small, reviewable patches.

For further details on roles and merging rules, see `AGENTS.md`.