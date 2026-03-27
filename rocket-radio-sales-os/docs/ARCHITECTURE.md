# Architecture Overview

Rocket Radio Sales OS is divided into several layers, each with clear responsibilities and boundaries. The design emphasises multi‑tenant support, provider‑agnostic AI integration and strict separation of concerns.

## Layers

### 1. UI Layer
Built on Next.js and React, the UI layer includes:
- Dashboard with pipeline and recent activity
- Client intake forms and business profiles
- Proposal builder and preview
- Creative editing interface
- Reporting dashboards and renewal recommendations

UI components consume normalised data from the application layer and display loading, error and success states. The UI never calls AI providers directly.

### 2. Application Layer
The application layer orchestrates state and business logic:
- Manages authenticated sessions and role permissions
- Normalises AI results into domain models
- Maintains global state via hooks in `src/state`
- Handles routing and server‑side rendering

### 3. AI Layer
The AI layer exposes a single function:

```ts
generateContent(input: GenerateContentInput): Promise<GenerateContentResult>
```

This function validates input against a schema, calls a provider (OpenAI or other) through `src/ai/providers`, normalises the response into a structured format and validates it. Sub‑modes (brief, script, proposal, report, renewal) are implemented within the provider.

### 4. Provider Layer
Each provider implementation lives in `src/ai/providers`. Providers encapsulate:
- Authentication and API calls (e.g. OpenAI API)
- Prompt construction and streaming
- Error handling and retries

Switching providers requires no changes to the UI or application layer.

### 5. Data Layer
A relational database stores multi‑tenant data. Key tables include:
- `users`, `teams`, `organizations`, `stations`
- `clients`, `contacts`
- `campaigns`, `proposals`, `creative_assets`, `reports`
- `prompt_templates`, `generation_runs`, `evaluation_scores`

Each tenant is isolated via an `organization_id` column on relevant tables. Access control is enforced in queries and the API layer.

### 6. Integration Layer
Integrations include:
- Email service for proposal delivery and follow‑ups
- Digital ad platforms for fulfilment (via tasks)
- Analytics ingestion for reporting
- Payment processing for subscription billing

## AI Data Flow

1. The UI gathers input via forms.
2. The Application Layer builds a `GenerateContentInput` object.
3. `generateContent()` validates and dispatches to the current provider.
4. The Provider constructs prompts and calls the API.
5. The response is normalised and validated against `GenerateContentResult`.
6. The Application Layer stores the result and returns it to the UI.

## Deployment

Rocket Radio Sales OS is designed for serverless deployment on Vercel. API routes run as serverless functions. The database is hosted separately (e.g. PlanetScale, Neon). CI runs on GitHub Actions and pushes to Vercel. See `DEPLOYMENT.md` for details.

## Security & Compliance

- Role‑based access control for multi‑tenant isolation.
- Per‑environment secrets for AI providers and databases.
- Audit logs of generation runs and user actions.
- GDPR/CCPA compliant data handling.

For further details on product use cases, see `PRODUCT.md`. For multi‑agent development procedures, see `AGENTS.md` and `AGENT-TASKS.md`.