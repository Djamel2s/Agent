# AGENT — "Give your AI agents a secure place to work."

Plateforme d'orchestration d'agents IA (monorepo pnpm + Turborepo). **Statut : socle vérifié + aperçu design (données de démo), pas le produit complet.**

## Ce qui existe réellement
- `packages/policies` : moteur de policies (ALLOW/DENY/APPROVAL, niveaux READ/ANALYZE/WRITE/ACT, risque LOW→CRITICAL, kill switches, fail-closed) + tests.
- `services/api` : Fastify (helmet, CORS, rate limit, validation Zod), `/health`, `/api/models/providers` (état honnête des providers), `/api/policy/evaluate`.
- `apps/web` : Next.js, splash animé avec le logo officiel, shell (sidebar, topbar, composer). Le chat est désactivé tant qu'aucun provider n'est configuré ; les modules non construits sont marqués « Coming soon ».

## Aperçu design (données de démo)
`pnpm dev` puis :
- http://localhost:3000 — webapp : splash, **Workspace** (présence des agents, timeline de Task animée, activité live, graphe de connexions, Context Lens), **Chat** (streaming simulé, tool call, artifact), Agents, Tasks (Simulate / Replay), Activity, Approvals, Memory, Knowledge, Integrations, palette **⌘K**.
- http://localhost:3002 — **compagnon de bureau** (prototype) : faux bureau, encoche → île animée, agents-créatures dont les yeux suivent le curseur, approbations en un clic (⏎ approuver, ⎋ plus tard), confettis, sons synthétisés, bouton « Play story ». Événements simulés ; prévu pour être encapsulé par Tauri 2 (non fait).
- http://localhost:3001 — admin : users, policies, audit, usage, kill switch.
Toutes les données viennent de `apps/web/lib/demo.ts` (webapp) et `apps/desktop/src/store.ts` (compagnon) et sont signalées « Demo » dans l'UI. Aucun modèle ni service réel n'est appelé ; le chat de démo ne parle pas à l'API.

## Pas encore construit
Auth/multi-tenant, base de données + migrations, chat/streaming, Model Gateway, agents, Tasks/runtime, MCP, RAG, mémoire, artifacts, admin, etc. Aucun n'est simulé dans l'UI.

## Lancer
Prérequis : Node 22, pnpm 10 (ou Docker).
```
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm dev            # web :3000, api :4000
docker compose up --build   # non vérifié dans l'environnement de génération
```
Variables : voir `.env.example`.

## External agent gateway

The integrations page now uses a server-side proxy for the external-agent gateway. Set a
long random `AGENT_GATEWAY_TOKEN` in a local `.env` file (do not expose it as a
`NEXT_PUBLIC_*` variable). The API accepts:

- `GET /api/external-agents`
- `POST /api/external-agents`
- `POST /api/external-agents/:id/invoke`

Requests are authenticated with `x-agent-gateway-token`. Agent credentials are referenced
by a server-side environment variable name (`secretEnv`); the value is never returned to
the UI. The HTTP adapter enforces bounded payloads, timeouts, no redirects, and blocks
private destinations in production. A2A and MCP registrations are visible in the UI but
remain explicitly `unsupported` until their protocol-native discovery, authentication,
streaming, and task lifecycle adapters are enabled.
