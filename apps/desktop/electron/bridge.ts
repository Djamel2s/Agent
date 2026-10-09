import http from "node:http";
import crypto from "node:crypto";
import type { AgentState, Approval, Risk } from "../src/store";

export type Decision = "approve" | "reject" | "timeout";
export interface BridgeAgent { id: string; name: string; state: AgentState; doing?: string }
export interface BridgeOptions {
  token: string;
  onAgent: (a: BridgeAgent) => void;
  onApproval: (item: Approval) => void;
  onCancel: (id: string) => void;
  maxPending?: number;
}

const STATES: readonly AgentState[] = ["working", "waiting", "reviewing", "idle", "completed"];
const RISKS: readonly Risk[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const MAX_BODY = 16 * 1024;

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim().length > 0 && v.length <= max ? v.trim() : null);
const sha = (s: string): Buffer => crypto.createHash("sha256").update(s).digest();

function send(res: http.ServerResponse, code: number, body?: unknown): void {
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function readJson(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { size += c.length; if (size > MAX_BODY) { reject(new Error("too_large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

/**
 * Local companion bridge. Loopback only; bearer token required; browser requests (Origin header) and
 * foreign Host headers are refused so a web page cannot talk to it (CSRF / DNS rebinding).
 */
export function createBridge(opts: BridgeOptions) {
  const tokenHash = sha(opts.token);
  const maxPending = opts.maxPending ?? 20;
  const pending = new Map<string, { resolve: (d: Decision) => void; timer: NodeJS.Timeout }>();

  const finish = (id: string, d: Decision): boolean => {
    const p = pending.get(id); if (!p) return false;
    clearTimeout(p.timer); pending.delete(id); p.resolve(d); return true;
  };

  const server = http.createServer((req, res) => {
    void (async () => {
      try {
        if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(req.headers.host ?? "")) return send(res, 403, { error: "bad_host" });
        if (req.headers.origin !== undefined) return send(res, 403, { error: "browser_requests_not_allowed" });
        const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
        if (!m || !crypto.timingSafeEqual(sha(m[1]!), tokenHash)) return send(res, 401, { error: "unauthorized" });

        if (req.method === "GET" && req.url === "/v1/health") return send(res, 200, { ok: true });
        if (req.method !== "POST") return send(res, 404, { error: "not_found" });

        let body: unknown;
        try { body = await readJson(req); } catch (e) { return send(res, (e as Error).message === "too_large" ? 413 : 400, { error: (e as Error).message }); }
        if (typeof body !== "object" || body === null) return send(res, 400, { error: "invalid_body" });
        const b = body as Record<string, unknown>;

        if (req.url === "/v1/agents") {
          const id = str(b.id, 64), name = str(b.name, 40);
          const state = STATES.find((s) => s === b.state);
          const doing = b.doing === undefined ? undefined : str(b.doing, 120);
          if (!id || !name || !state || doing === null) return send(res, 400, { error: "invalid_agent" });
          opts.onAgent({ id, name, state, ...(doing ? { doing } : {}) });
          return send(res, 204);
        }

        if (req.url === "/v1/approvals") {
          const title = str(b.title, 160), action = str(b.action, 64), by = str(b.by, 40), target = str(b.target, 160);
          const risk = RISKS.find((r) => r === b.risk) ?? "MEDIUM";
          const timeoutMs = typeof b.timeoutMs === "number" ? Math.min(Math.max(b.timeoutMs, 10), 300_000) : 60_000;
          if (!title || !action || !by || !target) return send(res, 400, { error: "invalid_approval" });
          if (pending.size >= maxPending) return send(res, 429, { error: "too_many_pending" });

          const id = `ext:${crypto.randomUUID()}`;
          const decision = new Promise<Decision>((resolve) => {
            pending.set(id, { resolve, timer: setTimeout(() => { finish(id, "timeout"); opts.onCancel(id); }, timeoutMs) });
          });
          res.on("close", () => { if (pending.has(id)) { finish(id, "timeout"); opts.onCancel(id); } });
          opts.onApproval({ id, kind: "action", title, action, by, risk, target, yes: "Approve", no: "Reject", agentId: str(b.agentId, 64) ?? undefined });
          return send(res, 200, { id, decision: await decision });
        }
        return send(res, 404, { error: "not_found" });
      } catch { send(res, 500, { error: "internal" }); }
    })();
  });

  return {
    server,
    listen: (port: number): Promise<number> => new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => resolve((server.address() as { port: number }).port));
    }),
    decide: (id: string, ok: boolean): boolean => finish(id, ok ? "approve" : "reject"),
    close: (): void => { for (const id of [...pending.keys()]) finish(id, "timeout"); server.close(); },
  };
}
