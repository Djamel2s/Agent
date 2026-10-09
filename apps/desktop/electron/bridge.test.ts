import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBridge } from "./bridge";

const TOKEN = "t".repeat(48);
let bridge: ReturnType<typeof createBridge> | undefined;
afterEach(() => bridge?.close());

async function start(over: Partial<Parameters<typeof createBridge>[0]> = {}) {
  const onApproval = vi.fn(); const onAgent = vi.fn(); const onCancel = vi.fn();
  bridge = createBridge({ token: TOKEN, onApproval, onAgent, onCancel, ...over });
  const port = await bridge.listen(0);
  const call = (path: string, init: RequestInit = {}, token: string | null = TOKEN) =>
    fetch(`http://127.0.0.1:${port}${path}`, { ...init, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json", ...(init.headers ?? {}) } });
  return { port, call, onApproval, onAgent, onCancel };
}
const approval = { title: "Post comment", action: "GITHUB_WRITE", by: "Developer", target: "acme/web#1", risk: "MEDIUM" };

describe("companion bridge", () => {
  it("requires a valid token", async () => {
    const { call } = await start();
    expect((await call("/v1/health", {}, null)).status).toBe(401);
    expect((await call("/v1/health", {}, "wrong")).status).toBe(401);
    expect((await call("/v1/health")).status).toBe(200);
  });
  it("refuses browser requests (Origin) and foreign Host headers", async () => {
    const { call, port } = await start();
    expect((await call("/v1/health", { headers: { origin: "http://evil.example" } })).status).toBe(403);
    const status = await new Promise<number>((resolve) => {
      const r = http.request({ host: "127.0.0.1", port, path: "/v1/health", headers: { host: "evil.example", authorization: `Bearer ${TOKEN}` } }, (res) => resolve(res.statusCode ?? 0));
      r.end();
    });
    expect(status).toBe(403);
  });
  it("validates bodies and caps their size", async () => {
    const { call } = await start();
    expect((await call("/v1/approvals", { method: "POST", body: "{nope" })).status).toBe(400);
    expect((await call("/v1/approvals", { method: "POST", body: JSON.stringify({ title: "x" }) })).status).toBe(400);
    expect((await call("/v1/agents", { method: "POST", body: JSON.stringify({ id: "a", name: "A", state: "flying" }) })).status).toBe(400);
    const big = await call("/v1/approvals", { method: "POST", body: JSON.stringify({ title: "x".repeat(40_000) }) }).catch(() => null);
    expect(big === null || big.status === 413).toBe(true);
  });
  it("accepts agent presence updates", async () => {
    const { call, onAgent } = await start();
    const res = await call("/v1/agents", { method: "POST", body: JSON.stringify({ id: "dev", name: "Dev", state: "working", doing: "Running tests" }) });
    expect(res.status).toBe(204);
    expect(onAgent).toHaveBeenCalledWith({ id: "dev", name: "Dev", state: "working", doing: "Running tests" });
  });
  it("holds an approval until the user decides", async () => {
    const { call, onApproval } = await start();
    const p = call("/v1/approvals", { method: "POST", body: JSON.stringify(approval) });
    await vi.waitFor(() => expect(onApproval).toHaveBeenCalled());
    const item = onApproval.mock.calls[0]![0] as { id: string };
    expect(item.id.startsWith("ext:")).toBe(true);
    expect(bridge!.decide(item.id, true)).toBe(true);
    expect(((await (await p).json()) as { decision: string }).decision).toBe("approve");
    expect(bridge!.decide(item.id, true)).toBe(false);
  });
  it("times out and cancels the card", async () => {
    const { call, onCancel } = await start();
    const res = await call("/v1/approvals", { method: "POST", body: JSON.stringify({ ...approval, timeoutMs: 30 }) });
    expect(((await res.json()) as { decision: string }).decision).toBe("timeout");
    expect(onCancel).toHaveBeenCalled();
  });
  it("limits pending approvals", async () => {
    const { call, onApproval } = await start({ maxPending: 1 });
    void call("/v1/approvals", { method: "POST", body: JSON.stringify(approval) });
    await vi.waitFor(() => expect(onApproval).toHaveBeenCalled());
    expect((await call("/v1/approvals", { method: "POST", body: JSON.stringify(approval) })).status).toBe(429);
  });
});
