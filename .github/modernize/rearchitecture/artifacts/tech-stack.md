# Technology stack

- Runtime: Node.js >=22, pnpm 10.12.1.
- Workspace: pnpm workspaces plus Turborepo.
- Language: TypeScript 5.8 with a shared base tsconfig.
- Web/admin: Next.js 15.3, React 19.1, Motion 12.
- API: Fastify 5.3, `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, Zod 3.24, tsup, tsx.
- Desktop: Electron 44.7, Vite 6.3, React 19.1, tsup, electron-builder.
- Tests: Vitest 3.1. API and policy tests exist; desktop bridge/store/native tests exist; web/admin scripts currently report no unit tests.
- Infrastructure: PostgreSQL 17 Alpine and Redis 7 Alpine in Compose; three Dockerfiles for API/web/admin.
- Persistence status: Compose provisions PostgreSQL and Redis, but no application code currently connects to either.
- Provider status: OpenAI, Anthropic, Google Gemini, and Mistral are detected through environment-key presence only.
- Migration blockers visible in source: demo data is the web/admin runtime source; provider adapters, auth, tenancy, persistence, agent runtime, streaming, MCP, RAG, memory, artifacts, and real admin APIs are absent.
