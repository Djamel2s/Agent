import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { evaluate, type PolicySet } from "@agent/policies";
import { completeChat, providerStatus } from "./providers.js";
import { createExternalAgentGateway } from "./external-agents.js";
import { createInternalAgentRegistry } from "./internal-agents.js";
import { createConversationStore } from "./conversations.js";
import { createAuthStore, readCookie, type AuthUser } from "./auth.js";

/** Demo policy set, replaced by DB-backed policies in the persistence milestone. */
export const DEMO_POLICIES: PolicySet = {
  resources: {
    github: { READ: "ALLOW", ANALYZE: "ALLOW", WRITE: "APPROVAL", ACT: "DENY" },
    email: { READ: "ALLOW", ANALYZE: "ALLOW", WRITE: "APPROVAL", ACT: "APPROVAL" },
    "external-agent": { READ: "ALLOW", ANALYZE: "ALLOW", WRITE: "APPROVAL", ACT: "DENY" },
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
  const externalAgents = createExternalAgentGateway(env);
  const internalAgents = createInternalAgentRegistry(env);
  await internalAgents.init();
  const conversations = createConversationStore(env);
  await conversations.init();
  const auth = createAuthStore(env);
  await auth.init();
  const auditEvents: Array<{
    type: string;
    agentId?: string;
    tenantId?: string;
    decision?: string;
    risk?: string;
    reason?: string;
    requestId: string;
    createdAt: string;
  }> = [];
  const recordAudit = (
    event: Omit<(typeof auditEvents)[number], "requestId" | "createdAt">,
    requestId: string,
  ) => {
    auditEvents.push({ ...event, requestId, createdAt: new Date().toISOString() });
    if (auditEvents.length > 1000) auditEvents.shift();
  };
  await app.register(helmet);
  await app.register(cors, { origin: env.WEB_ORIGIN ?? "http://localhost:3000" });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  const cookieHeader = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;
  const controlPlaneAuth = async (req: { headers: Record<string, string | string[] | undefined> }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }): Promise<AuthUser | "gateway" | undefined> => {
    const sessionUser = await auth.authenticate(readCookie(cookieHeader(req.headers.cookie), "agent_session"));
    if (sessionUser) return sessionUser;
    const token = env.AGENT_GATEWAY_TOKEN?.trim();
    if (token && req.headers["x-agent-gateway-token"] === token) return "gateway";
    reply.code(token ? 401 : 503).send({ error: token ? "unauthorized" : "gateway_not_configured" });
    return undefined;
  };
  const sessionFromRequest = async (req: { headers: Record<string, string | string[] | undefined> }) =>
    auth.authenticate(readCookie(cookieHeader(req.headers.cookie), "agent_session"));

  app.get("/health", async () => ({ status: "ok", service: "api" }));
  const authBody = z.object({ email: z.string().email().max(320), password: z.string().min(12).max(200), displayName: z.string().trim().min(1).max(80).optional() });
  app.post("/api/auth/register", async (req, reply) => {
    const parsed = authBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    try { return reply.code(201).send(await auth.register(parsed.data.email, parsed.data.password, parsed.data.displayName ?? parsed.data.email.split("@")[0] ?? "AGENT user")); }
    catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : "registration_failed" }); }
  });
  app.post("/api/auth/login", async (req, reply) => {
    const parsed = authBody.pick({ email: true, password: true }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    try {
      const result = await auth.login(parsed.data.email, parsed.data.password);
      reply.header("set-cookie", `agent_session=${result.token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${env.NODE_ENV === "production" ? "; Secure" : ""}`);
      return result.user;
    } catch { return reply.code(401).send({ error: "invalid_credentials" }); }
  });
  app.get("/api/auth/me", async (req, reply) => {
    const user = await auth.authenticate(readCookie(cookieHeader(req.headers.cookie), "agent_session"));
    return user ? user : reply.code(401).send({ error: "unauthorized" });
  });
  app.post("/api/auth/logout", async (req, reply) => {
    await auth.logout(readCookie(cookieHeader(req.headers.cookie), "agent_session"));
    reply.header("set-cookie", "agent_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
    return { ok: true };
  });

  app.get("/api/models/providers", async () => ({ providers: providerStatus(env) }));
  const conversationAuth = async (req: { headers: Record<string, string | string[] | undefined> }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }): Promise<boolean> => {
    return Boolean(await controlPlaneAuth(req, reply));
  };
  const conversationBody = z.object({ tenantId: z.string().min(1).max(100), agentId: z.string().min(1).max(100), title: z.string().max(160).optional() });
  app.get("/api/conversations", async (req, reply) => {
    if (!await conversationAuth(req, reply)) return;
    const sessionUser = await sessionFromRequest(req);
    const tenantId = sessionUser?.tenantId ?? String((req.query as { tenantId?: string }).tenantId ?? "");
    if (!tenantId) return reply.code(400).send({ error: "tenant_id_required" });
    if (!sessionUser && readCookie(cookieHeader(req.headers.cookie), "agent_session")) return reply.code(401).send({ error: "unauthorized" });
    return { conversations: await conversations.list(tenantId) };
  });
  app.post("/api/conversations", async (req, reply) => {
    if (!await conversationAuth(req, reply)) return;
    const parsed = conversationBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    const sessionUser = await sessionFromRequest(req);
    if (readCookie(cookieHeader(req.headers.cookie), "agent_session") && !sessionUser) return reply.code(401).send({ error: "unauthorized" });
    const tenantId = sessionUser?.tenantId ?? parsed.data.tenantId;
    return reply.code(201).send(await conversations.create(tenantId, parsed.data.agentId, parsed.data.title ?? "New conversation"));
  });
  app.get("/api/conversations/:id", async (req, reply) => {
    if (!await conversationAuth(req, reply)) return;
    const sessionUser = await sessionFromRequest(req);
    const tenantId = sessionUser?.tenantId ?? String((req.query as { tenantId?: string }).tenantId ?? "");
    if (!sessionUser && readCookie(cookieHeader(req.headers.cookie), "agent_session")) return reply.code(401).send({ error: "unauthorized" });
    const conversation = await conversations.get((req.params as { id: string }).id, tenantId);
    return conversation ? conversation : reply.code(404).send({ error: "conversation_not_found" });
  });
  app.get("/api/agents", async (req, reply) => {
    const identity = await controlPlaneAuth(req, reply);
    if (!identity) return;
    return { agents: await internalAgents.list(identity === "gateway" ? undefined : identity.tenantId) };
  });
  const agentMutationBody = z.object({
    name: z.string().trim().min(1).max(80),
    role: z.string().trim().min(1).max(160),
    provider: z.enum(["google", "openai"]),
    model: z.string().trim().min(1).max(100),
    instructions: z.string().trim().min(1).max(8_000),
    capabilities: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    state: z.enum(["idle", "ready", "disabled"]).optional(),
    hue: z.number().int().min(0).max(360).optional(),
  });
  app.post("/api/agents", async (req, reply) => {
    const identity = await controlPlaneAuth(req, reply);
    if (!identity) return;
    const parsed = agentMutationBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    try {
      const tenantId = identity === "gateway" ? "gateway" : identity.tenantId;
      const agent = await internalAgents.create(parsed.data, tenantId);
      recordAudit({ type: "internal_agent.created", agentId: agent.id, tenantId }, req.id);
      return reply.code(201).send(agent);
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "invalid_agent" }); }
  });
  app.patch("/api/agents/:id", async (req, reply) => {
    const identity = await controlPlaneAuth(req, reply);
    if (!identity) return;
    const parsed = agentMutationBody.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    try {
      const agent = await internalAgents.update((req.params as { id: string }).id, parsed.data, identity === "gateway" ? undefined : identity.tenantId);
      recordAudit({ type: "internal_agent.updated", agentId: agent.id, tenantId: identity === "gateway" ? undefined : identity.tenantId }, req.id);
      return agent;
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid_agent";
      return reply.code(message === "internal_agent_not_found" || message === "internal_agent_forbidden" ? 404 : 400).send({ error: message === "internal_agent_forbidden" ? "internal_agent_not_found" : message });
    }
  });
  app.delete("/api/agents/:id", async (req, reply) => {
    const identity = await controlPlaneAuth(req, reply);
    if (!identity) return;
    try {
      await internalAgents.remove((req.params as { id: string }).id, identity === "gateway" ? undefined : identity.tenantId);
      recordAudit({ type: "internal_agent.deleted", agentId: (req.params as { id: string }).id, tenantId: identity === "gateway" ? undefined : identity.tenantId }, req.id);
      return reply.code(200).send({ deleted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "internal_agent_not_found";
      return reply.code(message === "internal_agent_forbidden" ? 404 : 404).send({ error: message === "internal_agent_forbidden" ? "internal_agent_not_found" : message });
    }
  });

  const chatBody = z.object({
    messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1).max(32_000) })).min(1).max(50),
    model: z.string().max(100).optional(),
    provider: z.enum(["google", "openai"]).optional(),
    agentId: z.string().max(100).optional(),
    conversationId: z.string().uuid().optional(),
    tenantId: z.string().min(1).max(100),
  });
  app.post("/api/chat", async (req, reply) => {
    const gatewayToken = env.AGENT_GATEWAY_TOKEN?.trim();
    const sessionUser = await auth.authenticate(readCookie(cookieHeader(req.headers.cookie), "agent_session"));
    const hasGatewayAccess = Boolean(gatewayToken && req.headers["x-agent-gateway-token"] === gatewayToken);
    if (!sessionUser && !hasGatewayAccess) {
      return reply.code(gatewayToken ? 401 : 503).send({ error: gatewayToken ? "unauthorized" : "gateway_not_configured" });
    }
    const parsed = chatBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    const request = parsed.data;
    const authenticatedUser = sessionUser;
    if (readCookie(cookieHeader(req.headers.cookie), "agent_session") && !authenticatedUser) return reply.code(401).send({ error: "unauthorized" });
    const tenantId = authenticatedUser?.tenantId ?? request.tenantId;
    if (authenticatedUser && tenantId !== request.tenantId) return reply.code(403).send({ error: "tenant_forbidden" });
    let selectedAgent;
    try {
      selectedAgent = request.agentId && request.agentId !== "model-gateway" ? await internalAgents.get(request.agentId, authenticatedUser?.tenantId) : undefined;
    } catch (error) {
      if (error instanceof Error && error.message === "internal_agent_not_found") return reply.code(404).send({ error: error.message });
      throw error;
    }
    if (selectedAgent?.state === "disabled") return reply.code(403).send({ error: "internal_agent_disabled" });
    const policy = evaluate(DEMO_POLICIES, {
      tenantId,
      agentId: request.agentId ?? "model-gateway",
      resource: "external-agent",
      level: "READ",
      externalDestination: true,
      dataSensitivity: 0,
    });
    recordAudit({ type: "chat.policy_decision", agentId: request.agentId, tenantId, decision: policy.decision, risk: policy.risk, reason: policy.reason }, req.id);
    if (policy.decision !== "ALLOW") return reply.code(403).send({ error: "chat_not_allowed", decision: policy.decision, risk: policy.risk, reason: policy.reason });
    try {
      const result = await completeChat(env, {
        ...request,
        provider: selectedAgent?.provider ?? request.provider,
        model: selectedAgent?.model ?? request.model,
        messages: [
          ...(selectedAgent ? [{ role: "system" as const, content: selectedAgent.instructions }] : []),
          ...request.messages,
        ],
      });
      if (request.conversationId) {
        const latestUserMessage = [...request.messages].reverse().find((message) => message.role === "user");
        await conversations.append(request.conversationId, tenantId, [
          ...(latestUserMessage ? [latestUserMessage] : []),
          { role: "assistant", content: result.content },
        ]);
      }
      recordAudit({ type: "chat.completed", agentId: request.agentId, tenantId, decision: "ALLOW" }, req.id);
      return result;
    } catch (error) {
      recordAudit({ type: "chat.failed", agentId: request.agentId, tenantId, reason: error instanceof Error ? error.message : "chat_failed" }, req.id);
      const message = error instanceof Error ? error.message : "chat_failed";
      return reply.code(message === "model_provider_not_configured" ? 503 : 502).send({ error: message });
    }
  });

  app.post("/api/policy/evaluate", async (req, reply) => {
    const parsed = evaluateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    return evaluate(DEMO_POLICIES, parsed.data);
  });

  const gatewayBody = z.object({
    id: z.string(),
    name: z.string(),
    protocol: z.enum(["http", "a2a", "mcp"]),
    endpoint: z.string(),
    secretEnv: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
  });
  const invokeBody = z.object({
    input: z.string(),
    tenantId: z.string().min(1),
    agentId: z.string().min(1),
    level: z.enum(["READ", "ANALYZE", "WRITE", "ACT"]),
    dataSensitivity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  });
  const gatewayAuth = (req: { headers: Record<string, string | string[] | undefined> }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }): boolean => {
    if (!externalAgents.configured) { reply.code(503).send({ error: "gateway_not_configured" }); return false; }
    const header = req.headers["x-agent-gateway-token"];
    if (header !== externalAgents.token) { reply.code(401).send({ error: "unauthorized" }); return false; }
    return true;
  };
  app.get("/api/external-agents", async (req, reply) => {
    if (!gatewayAuth(req, reply)) return;
    return { agents: externalAgents.list() };
  });
  app.post("/api/external-agents", async (req, reply) => {
    if (!gatewayAuth(req, reply)) return;
    const parsed = gatewayBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    try {
      const registered = await externalAgents.register(parsed.data);
      recordAudit({ type: "external_agent.registered", agentId: registered.id }, req.id);
      return reply.code(201).send(registered);
    }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "invalid_agent" }); }
  });
  app.get("/api/audit/external-agents", async (req, reply) => {
    if (!gatewayAuth(req, reply)) return;
    return { events: auditEvents };
  });
  app.post("/api/external-agents/:id/invoke", async (req, reply) => {
    if (!gatewayAuth(req, reply)) return;
    const parsed = invokeBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    const request = parsed.data;
    const agentId = (req.params as { id: string }).id;
    const policy = evaluate(DEMO_POLICIES, {
      ...request,
      resource: "external-agent",
      externalDestination: true,
    });
    recordAudit({
      type: "external_agent.invocation_decision",
      agentId,
      tenantId: request.tenantId,
      decision: policy.decision,
      risk: policy.risk,
      reason: policy.reason,
    }, req.id);
    if (policy.decision === "DENY") {
      return reply.code(403).send({
        agentId,
        status: "denied",
        decision: policy.decision,
        risk: policy.risk,
        reason: policy.reason,
      });
    }
    if (policy.decision === "APPROVAL") {
      return reply.code(202).send({
        agentId,
        status: "approval_required",
        decision: policy.decision,
        risk: policy.risk,
        reason: policy.reason,
      });
    }
    try {
      const result = await externalAgents.invoke(agentId, request);
      recordAudit({ type: "external_agent.invoked", agentId, tenantId: request.tenantId, decision: "ALLOW" }, req.id);
      return result;
    }
    catch (error) {
      recordAudit({
        type: "external_agent.invocation_failed",
        agentId,
        tenantId: request.tenantId,
        reason: error instanceof Error ? error.message : "invocation_failed",
      }, req.id);
      return reply.code(400).send({ error: error instanceof Error ? error.message : "invocation_failed" });
    }
  });

  return app;
}
