# Project structure

## Classification

Fullstack TypeScript monorepo with four deployable surfaces: a Next.js web application, a Next.js admin console, a Fastify API, and an Electron desktop companion. The repository also contains the shared policy engine package and Docker/Compose packaging.

## Modules and layers

- `apps/web`: Next.js App Router UI. `app/(app)` contains the product routes; `components` contains the shell, chat context, visual components, and shared UI; `lib/demo.ts` is the current data source.
- `apps/admin`: single Next.js admin screen with local tab state and demo records.
- `services/api`: Fastify composition (`app.ts`), process entrypoint (`main.ts`), provider capability reporting (`providers.ts`).
- `packages/policies`: pure policy/risk evaluator with no framework dependency.
- `apps/desktop`: Vite/React renderer plus Electron main/preload processes. `src/store.ts` is the state machine; `electron/bridge.ts` is the authenticated local HTTP bridge.
- `infrastructure`: Dockerfiles and `compose.yaml` for PostgreSQL, Redis, API, web, and admin.

## Entry points

- `services/api/src/main.ts`: API process, port 4000 by default.
- `apps/web/app/layout.tsx` and `apps/web/app/(app)/layout.tsx`: web shell and route group.
- `apps/admin/app/layout.tsx` and `apps/admin/app/page.tsx`: admin console.
- `apps/desktop/src/main.tsx`: renderer; `apps/desktop/electron/main.ts`: Electron process.
- `packages/policies/src/index.ts`: public policy package entrypoint.

## Functional areas

Agent workspace, chat demo, agents, tasks, activity, approvals, memory, knowledge, integrations, admin governance, policy evaluation, provider readiness, desktop presence, and human approval bridge.

## Runtime truth

Only health, provider-status, and policy-evaluation API behavior are implemented as backend behavior. Web/admin records and chat/task flows are demo data. The desktop bridge is a real local integration path; the desktop story/state machine remains partly simulated.
