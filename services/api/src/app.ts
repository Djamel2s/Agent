import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { evaluate, type PolicySet } from "@agent/policies";
import { providerStatus } from "./providers.js";

/** Demo policy set, replaced by DB-backed policies in the persistence milestone. */
export const DEMO_POLICIES: PolicySet = {
  resources: {
    github: { READ: "ALLOW", ANALYZE: "ALLOW", WRITE: "APPROVAL", ACT: "DENY" },
    email: { READ: "ALLOW", ANALYZE: "ALLOW", WRITE: "APPROVAL", ACT: "APPROVAL" },
  },
  killed: { platform: false, resources: [], agents: [] },
};

const evaluateBody = z.object({
  tenantId: z.string().min(1),
  agentId: z.string().min(1),
  resource: z.string().min(1),
  level: z.enum(["READ", "ANALYZE", "WRITE", "ACT"]),
  externalDestination: z.boolean().optional(),
  dataSensitivity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export async function buildApp(env: NodeJS.ProcessEnv = process.env): Promise<FastifyInstance> {
  const app = Fastify({ logger: env.NODE_ENV !== "test", genReqId: () => crypto.randomUUID() });
  await app.register(helmet);
  await app.register(cors, { origin: env.WEB_ORIGIN ?? "http://localhost:3000" });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.get("/health", async () => ({ status: "ok", service: "api" }));

  app.get("/api/models/providers", async () => ({ providers: providerStatus(env) }));

  app.post("/api/policy/evaluate", async (req, reply) => {
    const parsed = evaluateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    return evaluate(DEMO_POLICIES, parsed.data);
  });

  return app;
}
