"use client";
import { useEffect, useState } from "react";
import { Badge, Page, PageHeader } from "../../../components/ui";

type Agent = { id: string; name: string; protocol: "http" | "a2a" | "mcp"; endpoint: string; capabilities: string[]; enabled: boolean; status: "configured" | "disabled" | "unsupported" };
type Form = { id: string; name: string; protocol: Agent["protocol"]; endpoint: string; secretEnv: string };

const EMPTY: Form = { id: "", name: "", protocol: "http", endpoint: "", secretEnv: "" };

export default function IntegrationsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [message, setMessage] = useState("Loading gateway…");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/external-agents", { cache: "no-store" });
    const body = await response.json() as { agents?: Agent[]; error?: string };
    if (!response.ok) { setMessage(body.error === "gateway_not_configured" ? "Gateway not configured on the server" : "Gateway unavailable"); return; }
    setAgents(body.agents ?? []); setMessage("Gateway connected");
  };
  useEffect(() => { void load(); }, []);

  const register = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/external-agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, secretEnv: form.secretEnv || undefined }) });
    const body = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) { setMessage(body.error ?? "Registration failed"); return; }
    setForm(EMPTY); setMessage("Agent registered without exposing its secret"); await load();
  };

  return (
    <Page>
      <PageHeader title="External agents" sub="Connect Copilot, MogwAI, A2A agents, MCP gateways, or private HTTP agents through one controlled boundary." />
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row" style={{ justifyContent: "space-between" }}><b>Gateway status</b><Badge tone={message === "Gateway connected" ? "ok" : "warn"}>{message}</Badge></div>
        <div className="muted small" style={{ marginTop: 8 }}>Credentials stay server-side as environment-variable references. Agents using A2A or MCP remain explicitly marked unsupported until their adapter and capability negotiation are enabled.</div>
      </div>
      <form className="card" onSubmit={register} style={{ marginBottom: 18 }}>
        <b>Register an agent</b>
        <div className="grid g3" style={{ marginTop: 12 }}>
          <input className="input" required placeholder="id (e.g. copilot-prod)" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
          <input className="input" required placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value as Form["protocol"] })}><option value="http">HTTP / REST adapter</option><option value="a2a">A2A</option><option value="mcp">MCP</option></select>
          <input className="input" required placeholder="https://agent.example/run" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
          <input className="input" placeholder="Secret env var (e.g. COPILOT_TOKEN)" value={form.secretEnv} onChange={(e) => setForm({ ...form, secretEnv: e.target.value })} />
          <button className="btn" disabled={busy || message === "Gateway not configured on the server"}>{busy ? "Registering…" : "Register securely"}</button>
        </div>
      </form>
      <div className="grid g3">
        {agents.map((agent) => <div className="card hover" key={agent.id}><div className="row" style={{ justifyContent: "space-between" }}><b>{agent.name}</b><Badge tone={agent.status === "configured" ? "ok" : "warn"}>{agent.status}</Badge></div><div className="muted small" style={{ marginTop: 6 }}>{agent.protocol.toUpperCase()} · {agent.endpoint}</div><div className="muted small" style={{ marginTop: 8 }}>{agent.capabilities.length ? agent.capabilities.join(" · ") : "No capabilities discovered yet"}</div></div>)}
        {!agents.length && <div className="card"><b>No external agents registered</b><div className="muted small" style={{ marginTop: 6 }}>Register one above, or configure the gateway token before connecting this workspace.</div></div>}
      </div>
    </Page>
  );
}
