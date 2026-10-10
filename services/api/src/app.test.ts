import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

describe("api", () => {
  it("health", async () => {
    const app = await buildApp({ NODE_ENV: "test" });
    const res = await app.inject({ url: "/health" });
    expect(res.json()).toEqual({ status: "ok", service: "api" });
  });
  it("hashes passwords and manages HttpOnly sessions", async () => {
    const app = await buildApp({ NODE_ENV: "test" });
    const created = await app.inject({ method: "POST", url: "/api/auth/register", payload: { email: "owner@example.com", password: "correct horse battery staple" } });
    expect(created.statusCode).toBe(201);
    expect(created.body).not.toContain("password");
    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "owner@example.com", password: "correct horse battery staple" } });
    expect(login.statusCode).toBe(200);
    const cookie = login.headers["set-cookie"];
    expect(cookie).toContain("HttpOnly");
    const me = await app.inject({ url: "/api/auth/me", headers: { cookie: String(cookie).split(";")[0] } });
    expect(me.json()).toMatchObject({ email: "owner@example.com" });
  });
  it("reports providers as not configured without keys, and never leaks keys", async () => {
    const app = await buildApp({ NODE_ENV: "test" });
    const none = (await app.inject({ url: "/api/models/providers" })).json();
    expect(none.providers.every((p: { configured: boolean }) => !p.configured)).toBe(true);
    const app2 = await buildApp({ NODE_ENV: "test", OPENAI_API_KEY: "sk-secret" });
    const res = await app2.inject({ url: "/api/models/providers" });
    expect(res.body).not.toContain("sk-secret");
    expect(res.json().providers.find((p: { id: string }) => p.id === "openai").configured).toBe(true);
  });
  it("policy endpoint validates input and applies policy", async () => {
    const app = await buildApp({ NODE_ENV: "test" });
    const bad = await app.inject({ method: "POST", url: "/api/policy/evaluate", payload: { level: "NOPE" } });
    expect(bad.statusCode).toBe(400);
    const ok = await app.inject({
      method: "POST", url: "/api/policy/evaluate",
      payload: { tenantId: "t", agentId: "a", resource: "github", level: "WRITE" },
    });
    expect(ok.json().decision).toBe("APPROVAL");
  });
  it("protects and invokes a configured external HTTP agent", async () => {
    const app = await buildApp({ NODE_ENV: "test", AGENT_GATEWAY_TOKEN: "gateway-secret" });
    const denied = await app.inject({ url: "/api/external-agents", headers: { "x-agent-gateway-token": "wrong" } });
    expect(denied.statusCode).toBe(401);

    const registration = await app.inject({
      method: "POST",
      url: "/api/external-agents",
      headers: { "x-agent-gateway-token": "gateway-secret" },
      payload: { id: "local-agent", name: "Local agent", protocol: "http", endpoint: "http://127.0.0.1:9/invoke", secretEnv: "LOCAL_AGENT_TOKEN" },
    });
    expect(registration.statusCode).toBe(201);
    expect(registration.body).not.toContain("LOCAL_AGENT_TOKEN");

    const listed = await app.inject({ url: "/api/external-agents", headers: { "x-agent-gateway-token": "gateway-secret" } });
    expect(listed.json().agents[0].secretEnv).toBe("[server-side reference]");
    const unsupported = await app.inject({
      method: "POST",
      url: "/api/external-agents",
      headers: { "x-agent-gateway-token": "gateway-secret" },
      payload: { id: "a2a-agent", name: "A2A agent", protocol: "a2a", endpoint: "http://127.0.0.1:9/a2a" },
    });
    expect(unsupported.statusCode).toBe(201);
    const result = await app.inject({
      method: "POST",
      url: "/api/external-agents/a2a-agent/invoke",
      headers: { "x-agent-gateway-token": "gateway-secret" },
      payload: { input: "hello", tenantId: "t", agentId: "a", level: "READ" },
    });
    expect(result.json()).toMatchObject({ status: "unsupported", reason: "a2a_adapter_not_configured" });
  });
  it("fails closed before invoking external agents and records the decision", async () => {
    const app = await buildApp({ NODE_ENV: "test", AGENT_GATEWAY_TOKEN: "gateway-secret" });
    await app.inject({
      method: "POST",
      url: "/api/external-agents",
      headers: { "x-agent-gateway-token": "gateway-secret" },
      payload: { id: "write-agent", name: "Write agent", protocol: "http", endpoint: "http://127.0.0.1:9/invoke" },
    });
    const approval = await app.inject({
      method: "POST",
      url: "/api/external-agents/write-agent/invoke",
      headers: { "x-agent-gateway-token": "gateway-secret" },
      payload: { input: "mutate", tenantId: "tenant-a", agentId: "caller-a", level: "WRITE" },
    });
    expect(approval.statusCode).toBe(202);
    expect(approval.json()).toMatchObject({ status: "approval_required", decision: "APPROVAL" });

    const denied = await app.inject({
      method: "POST",
      url: "/api/external-agents/write-agent/invoke",
      headers: { "x-agent-gateway-token": "gateway-secret" },
      payload: { input: "mutate", tenantId: "tenant-a", agentId: "caller-a", level: "ACT" },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toMatchObject({ status: "denied", decision: "DENY" });

    const audit = await app.inject({
      url: "/api/audit/external-agents",
      headers: { "x-agent-gateway-token": "gateway-secret" },
    });
    expect(audit.json().events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "external_agent.registered", agentId: "write-agent" }),
      expect.objectContaining({ type: "external_agent.invocation_decision", decision: "APPROVAL", risk: "MEDIUM" }),
      expect.objectContaining({ type: "external_agent.invocation_decision", decision: "DENY" }),
    ]));
  });
  it("returns an explicit unavailable response when no model provider is configured", async () => {
    const app = await buildApp({ NODE_ENV: "test", AGENT_GATEWAY_TOKEN: "gateway-secret" });
    const result = await app.inject({
      method: "POST",
      url: "/api/chat",
      headers: { "x-agent-gateway-token": "gateway-secret" },
      payload: { tenantId: "tenant-a", messages: [{ role: "user", content: "Hello" }] },
    });
    expect(result.statusCode).toBe(503);
    expect(result.json()).toEqual({ error: "model_provider_not_configured" });
  });
  it("lists internal agents only with the gateway token", async () => {
    const app = await buildApp({ NODE_ENV: "test", AGENT_GATEWAY_TOKEN: "gateway-secret" });
    const denied = await app.inject({ url: "/api/agents" });
    expect(denied.statusCode).toBe(401);
    const listed = await app.inject({ url: "/api/agents", headers: { "x-agent-gateway-token": "gateway-secret" } });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().agents).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "researcher", provider: "google", model: "gemini-2.5-flash" }),
    ]));
    expect(listed.body).not.toContain("API_KEY");
  });
  it("creates, updates, and deletes an internal agent through the control plane", async () => {
    const app = await buildApp({ NODE_ENV: "test", AGENT_GATEWAY_TOKEN: "gateway-secret" });
    const headers = { "x-agent-gateway-token": "gateway-secret", "content-type": "application/json" };
    const created = await app.inject({ method: "POST", url: "/api/agents", headers, payload: { name: "Planner", role: "Plans work", provider: "google", model: "gemini-2.5-flash", instructions: "Plan safely." } });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const updated = await app.inject({ method: "PATCH", url: `/api/agents/${id}`, headers, payload: { name: "Planner Pro" } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().name).toBe("Planner Pro");
    const removed = await app.inject({ method: "DELETE", url: `/api/agents/${id}`, headers: { "x-agent-gateway-token": "gateway-secret" } });
    expect(removed.statusCode).toBe(200);
  });
  it("isolates private agents and conversations between user tenants", async () => {
    const app = await buildApp({ NODE_ENV: "test", AGENT_GATEWAY_TOKEN: "gateway-secret" });
    const register = async (email: string) => {
      await app.inject({ method: "POST", url: "/api/auth/register", payload: { email, password: "correct horse battery staple" } });
      const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: "correct horse battery staple" } });
      return String(login.headers["set-cookie"]).split(";")[0];
    };
    const alice = await register("alice-isolation@example.com");
    const bob = await register("bob-isolation@example.com");
    const aliceHeaders = { cookie: alice, "content-type": "application/json" };
    const bobHeaders = { cookie: bob };

    const created = await app.inject({
      method: "POST", url: "/api/agents", headers: aliceHeaders,
      payload: { name: "Alice private", role: "Personal", provider: "google", model: "gemini-2.5-flash", instructions: "Private instructions." },
    });
    expect(created.statusCode).toBe(201);
    const agentId = created.json().id as string;

    const aliceList = await app.inject({ url: "/api/agents", headers: aliceHeaders });
    expect(aliceList.json().agents).toEqual(expect.arrayContaining([expect.objectContaining({ id: agentId, name: "Alice private" })]));
    const bobList = await app.inject({ url: "/api/agents", headers: bobHeaders });
    expect(bobList.json().agents).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: agentId })]));

    const forbiddenUpdate = await app.inject({ method: "PATCH", url: `/api/agents/${agentId}`, headers: { ...bobHeaders, "content-type": "application/json" }, payload: { name: "Stolen" } });
    expect(forbiddenUpdate.statusCode).toBe(404);
    const forbiddenDelete = await app.inject({ method: "DELETE", url: `/api/agents/${agentId}`, headers: bobHeaders });
    expect(forbiddenDelete.statusCode).toBe(404);

    const conversation = await app.inject({
      method: "POST", url: "/api/conversations", headers: aliceHeaders,
      payload: { tenantId: "forged-tenant", agentId, title: "Alice private thread" },
    });
    expect(conversation.statusCode).toBe(201);
    const conversationId = conversation.json().id as string;
    const bobConversation = await app.inject({ url: `/api/conversations/${conversationId}?tenantId=forged-tenant`, headers: bobHeaders });
    expect(bobConversation.statusCode).toBe(404);
  });
  it("persists conversations behind the gateway boundary", async () => {
    const app = await buildApp({ NODE_ENV: "test", AGENT_GATEWAY_TOKEN: "gateway-secret" });
    const headers = { "x-agent-gateway-token": "gateway-secret" };
    const created = await app.inject({ method: "POST", url: "/api/conversations", headers, payload: { tenantId: "tenant-a", agentId: "researcher", title: "Planning" } });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const listed = await app.inject({ url: "/api/conversations?tenantId=tenant-a", headers });
    expect(listed.json().conversations).toEqual(expect.arrayContaining([expect.objectContaining({ id, title: "Planning" })]));
    const fetched = await app.inject({ url: `/api/conversations/${id}?tenantId=tenant-a`, headers });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().messages).toEqual([]);
  });
});
