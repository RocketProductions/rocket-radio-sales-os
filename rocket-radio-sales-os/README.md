# Rocket Radio Sales OS

Rocket Radio Sales OS is a multi‑tenant SaaS designed for radio and local media sales teams. It helps account executives, managers and clients turn business objectives into tailored broadcast and digital campaigns in minutes. The system builds proposals, creative assets, fulfilment packets and performance reports from structured inputs and generative AI.

## Core Principles

- **Multi‑Tenant from Day One** – the architecture supports multiple organisations, stations and agencies with isolated data and configurable branding.
- **Provider‑Agnostic AI Layer** – all AI calls flow through a single `generateContent()` entry point with swappable model providers.
- **Explicit Task Design** – tasks for the code generation agent (Codex) are small, verifiable and self‑contained.
- **Fail Loudly** – validation and error reporting are built into every layer.
- **CI & QA First** – tests, type checks and linting run automatically on each change.

## Quick Start

```bash
npm install
npm run dev
```

To run tests, type checks and lints:

```bash
npm run verify
```

Create a `.env.local` file from `.env.example` and provide your API keys (e.g. `OPENAI_API_KEY` and `OPENAI_MODEL`).

## Project Structure

```text
/src
  /ai               AI abstraction layer (provider isolation)
  /app              Next.js application
  /components       React components
  /state            Global state hooks
  /types            Shared TypeScript types
  /docs             Product, architecture and agent docs
  /tests            Unit and integration tests
  /scripts          Verification tools
/AGENTS.md          Multi‑agent workflow rules
/README.md          This file
```

## Multi‑Tenant Architecture

Rocket Radio Sales OS is designed to serve multiple organisations. Each entity (organisation, station, client) has its own namespace and data segregation. The platform uses role‑based access controls to manage account executives, managers and clients. Configuration files and environment variables allow branded proposal templates and AI settings per tenant.

## Connecting to Vercel

To enable automatic preview and production deployments:

1. Sign in to [Vercel](https://vercel.com) using your GitHub account.
2. Import this GitHub repository into Vercel.
3. In **Settings → Environment Variables** add your `OPENAI_API_KEY`, `OPENAI_MODEL` and any database secrets for each environment (Preview and Production).
4. Enable **Preview Deployments** so every branch and pull request gets its own URL.
5. Promote the Preview deployment to Production when your tests and QA pass.

See `docs/DEPLOYMENT.md` for more details.

---

## Codex Workflow

Rocket Radio Sales OS is built with OpenAI Codex in mind. The repository includes `AGENTS.md` with instructions for multi‑agent development and a task system. Typical tasks include:

- Backend scaffold (databases, auth, organisation model)
- AI scaffold (providers, prompt contracts, evaluation)
- UI scaffold (dashboard, forms, proposal builder)
- QA scaffold (tests, CI, smoke scripts)

Each task runs in its own sandbox. After making changes, agents must run `npm run verify` and provide a summary of what changed, test results and remaining risks.

For more information, see `AGENTS.md` and `docs/AGENT-TASKS.md`.