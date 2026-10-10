"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { readAgentAppearances, saveAgentAppearance, type AgentAppearance } from "../../../lib/demo";
import { Avatar, Badge, Page, PageHeader, StatusDot } from "../../../components/ui";
import { Icon } from "../../../components/Icon";

export default function AgentsPage() {
  const [view, setView] = useState<"builder" | "skills" | "mcp" | "prompts">("builder");
  type Agent = { id: string; name: string; role: string; provider: string; model: string; capabilities: string[]; state: string; hue: number };
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [appearances, setAppearances] = useState<Record<string, AgentAppearance>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", role: "", provider: "google", model: "gemini-2.5-flash", instructions: "", capabilities: "conversation" });
  useEffect(() => {
    setAppearances(readAgentAppearances());
    fetch("/api/agents").then(async (r) => r.ok ? (await r.json()).agents as Agent[] : []).then(setAgents).finally(() => setLoading(false));
  }, []);
  const edit = editing ? agents.find((a) => a.id === editing) : undefined;
  const selectedAgent = agents.find((a) => a.id === selectedId) ?? agents[0];
  const current = editing ? (appearances[editing] ?? {}) : {};
  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView === "skills" || requestedView === "mcp" || requestedView === "prompts" || requestedView === "builder") setView(requestedView);
  }, []);
  const update = (patch: AgentAppearance) => {
    if (!editing) return;
    const next = { ...current, ...patch };
    saveAgentAppearance(editing, next);
    setAppearances((all) => ({ ...all, [editing]: next }));
  };
  return (
    <Page>
      <PageHeader title="Agents" sub="Build agents with identity, model, system prompt, skills, MCP tools and policy controls." actions={<button className="btn primary" onClick={() => { setDraft({ name: "", role: "", provider: "google", model: "gemini-2.5-flash", instructions: "", capabilities: "conversation" }); setCreating(true); }}><Icon name="plus" size={15} /> Create an agent</button>} />
      <div className="tabs builder-tabs">
        {([
          ["builder", "Builder", "bot"],
          ["skills", "Skills", "spark"],
          ["mcp", "MCP tools", "command"],
          ["prompts", "Prompts", "file"],
        ] as const).map(([id, label, icon]) => <button key={id} className={`tab ${view === id ? "on" : ""}`} onClick={() => setView(id)}><Icon name={icon} size={15} />{label}</button>)}
      </div>
      {view !== "builder" && <div className="builder-panel card">
        {view === "skills" && <><div className="builder-panel-head"><div><h2>Skills library</h2><p className="muted">Reusable capabilities that agents can activate per task.</p></div><button className="btn"><Icon name="plus" size={14} /> Add skill</button></div><div className="grid g3"><div className="card hover"><b>Web research</b><p className="muted small">Search, extract and cite sources with a controlled browser.</p><Badge tone="ok">Enabled</Badge></div><div className="card hover"><b>Code execution</b><p className="muted small">Run safe analysis jobs in an isolated workspace.</p><Badge>Available</Badge></div><div className="card hover"><b>Document analysis</b><p className="muted small">Read PDFs and structured files with citations.</p><Badge>Available</Badge></div></div></>}
        {view === "mcp" && <><div className="builder-panel-head"><div><h2>MCP servers</h2><p className="muted">Connect tools through explicit servers and permission scopes.</p></div><button className="btn"><Icon name="plus" size={14} /> Add MCP server</button></div><div className="list-item"><div className="row" style={{ justifyContent: "space-between" }}><b>Documentation tools</b><Badge tone="ok">Connected</Badge></div><div className="muted small">stdio · 8 tools · read-only policy</div></div><div className="list-item"><div className="row" style={{ justifyContent: "space-between" }}><b>GitHub workspace</b><Badge tone="warn">Needs approval</Badge></div><div className="muted small">HTTP · 12 tools · write actions gated</div></div></>}
        {view === "prompts" && <><div className="builder-panel-head"><div><h2>Prompt library</h2><p className="muted">Versioned system prompts assigned to your agents.</p></div><button className="btn"><Icon name="plus" size={14} /> New prompt</button></div><div className="list-item"><div className="row" style={{ justifyContent: "space-between" }}><b>Research analyst v3</b><Badge tone="ok">Published</Badge></div><div className="muted small">Researcher · 2,140 tokens · updated today</div></div><div className="list-item"><div className="row" style={{ justifyContent: "space-between" }}><b>Secure coding reviewer</b><Badge>Draft</Badge></div><div className="muted small">Developer · 1,680 tokens · last edited yesterday</div></div></>}
      </div>}
      {view === "builder" && <div className="agent-studio">
        <aside className="agent-studio-list">
          <div className="studio-list-head"><b>My agents</b><button className="icon-btn" onClick={() => setCreating(true)} aria-label="Create agent"><Icon name="plus" size={15} /></button></div>
          <label className="studio-search"><Icon name="search" size={14} /><input placeholder="Search agents" aria-label="Search agents" /></label>
          <div className="studio-list-scroll">
            {agents.map((a) => <button key={a.id} className={`studio-agent ${selectedAgent?.id === a.id ? "on" : ""}`} onClick={() => setSelectedId(a.id)}>
              <Avatar name={appearances[a.id]?.emoji || a.name} hue={appearances[a.id]?.hue ?? a.hue} /><span><b>{appearances[a.id]?.label || a.name}</b><small>{a.role}</small></span><StatusDot state={a.state === "ready" ? "idle" : "working"} />
            </button>)}
          </div>
        </aside>
        {selectedAgent ? <section className="agent-studio-editor">
          <div className="studio-editor-head"><div><span className="eyebrow">Agent configuration</span><h2>{appearances[selectedAgent.id]?.label || selectedAgent.name}</h2><p className="muted">{selectedAgent.role}</p></div><div className="row"><Badge tone="ok">Saved</Badge><button className="btn small" onClick={() => setEditing(selectedAgent.id)}>Customize</button></div></div>
          <div className="agent-config-section">
            <div className="config-heading"><div><b>Identity</b><span className="muted small">Name, description and avatar</span></div><Icon name="edit" size={15} /></div>
            <div className="config-identity"><Avatar name={appearances[selectedAgent.id]?.emoji || selectedAgent.name} hue={appearances[selectedAgent.id]?.hue ?? selectedAgent.hue} /><div className="config-fields"><div className="config-field"><label>Name</label><div className="config-input">{selectedAgent.name}</div></div><div className="config-field"><label>Description</label><div className="config-input">{selectedAgent.role}</div></div></div></div>
          </div>
          <div className="agent-config-section"><div className="config-heading"><div><b>Model & category</b><span className="muted small">Choose the model used by this agent</span></div><Icon name="chevron-down" size={15} /></div><div className="config-grid"><div className="config-field"><label>Model</label><button className="config-select">{selectedAgent.provider} · {selectedAgent.model}<Icon name="chevron-down" size={14} /></button></div><div className="config-field"><label>Category</label><button className="config-select">General purpose<Icon name="chevron-down" size={14} /></button></div></div></div>
          <div className="agent-config-section"><div className="config-heading"><div><b>Instructions</b><span className="muted small">System prompt applied to every conversation</span></div><Icon name="edit" size={15} /></div><textarea className="config-textarea" defaultValue={appearances[selectedAgent.id]?.label ? `You are ${appearances[selectedAgent.id]?.label}, a reliable AI agent.` : "You are a reliable AI agent. Follow the workspace policy and be concise."} /></div>
          <div className="agent-config-section"><div className="config-heading"><div><b>Tools</b><span className="muted small">Built-in capabilities, MCP servers, actions and skills</span></div><button className="btn small"><Icon name="plus" size={14} /> Add</button></div><div className="tool-library"><button className="tool-row on"><span className="tool-icon"><Icon name="waveform" size={15} /></span><span><b>Web search</b><small>Search and cite sources</small></span><span className="tool-toggle on" /></button><button className="tool-row"><span className="tool-icon"><Icon name="command" size={15} /></span><span><b>Code interpreter</b><small>Run isolated code analysis</small></span><span className="tool-toggle" /></button><button className="tool-row"><span className="tool-icon"><Icon name="link" size={15} /></span><span><b>Documentation MCP</b><small>8 read-only tools · connected</small></span><span className="tool-toggle on" /></button><button className="tool-row"><span className="tool-icon"><Icon name="spark" size={15} /></span><span><b>Document analysis skill</b><small>Reusable skill · selected</small></span><span className="tool-toggle on" /></button></div></div>
          <div className="agent-config-section"><div className="config-heading"><div><b>Conversation starters</b><span className="muted small">Suggested prompts shown when a new chat starts</span></div><Icon name="plus" size={15} /></div><div className="starter-chips"><span>Summarize this document</span><span>Research a topic</span><span>Help me plan a task</span></div></div>
        </section> : <div className="agent-empty"><Icon name="bot" size={30} /><b>Select an agent</b><span className="muted">Choose an agent from the list to configure it.</span></div>}
      </div>}
      {loading && <div className="muted">Loading your agents…</div>}
      {view !== "builder" && <div className="grid g3">
        {agents.map((a, i) => (
          <motion.div key={a.id} className="card hover" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row"><Avatar name={appearances[a.id]?.emoji || a.name} hue={appearances[a.id]?.hue ?? a.hue} /><div><b>{appearances[a.id]?.label || a.name}</b><div className="muted small">{a.role}</div></div></div>
              <StatusDot state={a.state === "ready" ? "idle" : a.state === "disabled" ? "waiting" : "working"} />
            </div>
            <div className="small muted" style={{ marginTop: 12 }}>Model</div>            <div>{a.provider} · {a.model}</div>
            <div className="small muted" style={{ marginTop: 10 }}>Capabilities</div>
            <div className="tags">{a.capabilities.map((t) => <span key={t} className="tag">{t}</span>)}</div>
            <div className="row" style={{ marginTop: 14 }}><Badge>Own identity</Badge><Badge>Policy-gated</Badge><button className="btn small" onClick={() => setEditing(a.id)}>Customize</button><button className="btn small" onClick={async () => { await fetch(`/api/agents/${a.id}`, { method: "DELETE" }); setAgents((all) => all.filter((x) => x.id !== a.id)); }}>Delete</button></div>
          </motion.div>
        ))}
      </div>}
      {creating && (
        <div className="modal-backdrop" role="presentation" onClick={() => setCreating(false)}>
          <div className="card modal" role="dialog" aria-modal="true" aria-label="Create agent" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between" }}><div><h2>Create an agent</h2><p className="muted">Secrets, prompts and tool permissions stay server-side.</p></div><button className="icon-btn" onClick={() => setCreating(false)} aria-label="Close">×</button></div>
            <label className="field">Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label className="field">Role<input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} /></label>
            <label className="field">Model<select value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })}><option value="google">Google Gemini</option><option value="openai">OpenAI-compatible</option></select></label>
            <label className="field">Model name<input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} /></label>
            <label className="field">Instructions<textarea value={draft.instructions} maxLength={8000} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} /></label>
            <label className="field">Capabilities<input value={draft.capabilities} onChange={(e) => setDraft({ ...draft, capabilities: e.target.value })} /></label>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 18 }}><button className="btn primary" onClick={async () => { const response = await fetch("/api/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, capabilities: draft.capabilities.split(",").map((x) => x.trim()).filter(Boolean) }) }); if (response.ok) { const created = await response.json() as Agent; setAgents((all) => [...all, created]); setCreating(false); } }}>Create agent</button></div>
          </div>
        </div>
      )}
      {edit && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <div className="card modal" role="dialog" aria-modal="true" aria-label={`Customize ${edit.name}`} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between" }}><div><h2>Customize {edit.name}</h2><p className="muted">These preferences are local to this workspace and never change gateway permissions.</p></div><button className="icon-btn" onClick={() => setEditing(null)} aria-label="Close">×</button></div>
            <label className="field">Display name<input value={current.label ?? edit.name} maxLength={60} onChange={(e) => update({ label: e.target.value })} /></label>
            <label className="field">Avatar emoji<input value={current.emoji ?? ""} placeholder="Optional" maxLength={2} onChange={(e) => update({ emoji: e.target.value })} /></label>
            <label className="field">Accent hue<input type="range" min="0" max="360" value={current.hue ?? edit.hue} onChange={(e) => update({ hue: Number(e.target.value) })} /></label>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 18 }}><button className="btn primary" onClick={() => setEditing(null)}>Done</button></div>
          </div>
        </div>
      )}
    </Page>
  );
}
