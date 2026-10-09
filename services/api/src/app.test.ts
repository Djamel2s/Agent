import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

describe("api", () => {
  it("health", async () => {
    const app = await buildApp({ NODE_ENV: "test" });
    const res = await app.inject({ url: "/health" });
    expect(res.json()).toEqual({ status: "ok", service: "api" });
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
});
