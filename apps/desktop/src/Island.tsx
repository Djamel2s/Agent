import { useEffect, useState, type Dispatch } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Orb } from "./Orb";
import { Confetti } from "./Confetti";
import { blip } from "./sound";
import { modeOf, TASK_STEPS, type Action, type Mode, type State } from "./store";
import { GLOW_NATIVE, SIZE } from "./layout";

const LOGO = `${import.meta.env.BASE_URL}logo.png`;
const GLOW: Record<Mode, string> = { idle: "0 0 0 rgba(0,0,0,0)", compact: "0 0 40px -8px rgba(8,150,255,.55)", celebrate: "0 0 60px -4px rgba(53,208,127,.8)", alert: "0 0 70px -6px rgba(245,185,66,.7)", expanded: "0 0 70px -20px rgba(8,150,255,.5)" };
const IS_NATIVE = typeof window !== "undefined" && window.agentNative !== undefined;
const shadowOf = (m: Mode): string => (IS_NATIVE ? GLOW_NATIVE[m] : `${GLOW[m]}, 0 24px 60px rgba(0,0,0,.55)`);
const RISK_TONE: Record<string, string> = { LOW: "ok", MEDIUM: "warn", HIGH: "bad", CRITICAL: "crit" };
type Tab = "Overview" | "Agents" | "Tasks" | "Activity" | "Skills" | "MCP" | "Prompts";

function Summary({ s, onSelect }: { s: State; onSelect: (id: string) => void }) {
  const working = s.agents.filter((a) => a.state === "working" || a.state === "reviewing").length;
  const waiting = s.approvals.length;
  return (
    <div className="summary">
      <img src={LOGO} alt="" className="mini-logo" />
      <div className="orbs">{s.agents.map((a) => <button key={a.id} className="agent-orb" title={`Open ${a.name}`} aria-label={`Open ${a.name}`} onClick={(event) => { event.stopPropagation(); onSelect(a.id); }}><Orb hue={a.hue} state={a.state} size={26} /></button>)}</div>
      <span className="sum-t">{s.celebrate > 0 ? <b className="green">Task completed ✓</b> : waiting ? <b className="amber">{waiting} needs you</b> : working ? `${working} working` : "all quiet"}</span>
    </div>
  );
}

function AlertCard({ s, d }: { s: State; d: Dispatch<Action> }) {
  const a = s.approvals[0]; if (!a) return null;
  const decide = (ok: boolean) => { blip(ok ? "ok" : "no"); d({ type: "DECIDE", id: a.id, ok }); };
  return (
    <motion.div className={`alert-card tone-${RISK_TONE[a.risk]}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
      <div className="alert-top">
        <div><div className="alert-title">{a.title}</div><div className="alert-sub"><span className="mono">{a.action}</span> · {a.target}</div></div>
        <span className={`risk r-${RISK_TONE[a.risk]}`}>{a.risk}</span>
      </div>
      <div className="alert-actions">
        <button className="b-yes" onClick={() => decide(true)}>{a.yes} <kbd>⏎</kbd></button>
        <button className="b-no" onClick={() => decide(false)}>{a.no}</button>
        <button className="b-mod" onClick={() => d({ type: "EXPAND", value: true })}>Details</button>
        <span className="alert-more">{s.approvals.length > 1 ? `+${s.approvals.length - 1} more` : "⎋ later"}</span>
      </div>
      <motion.div className="countdown" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 30, ease: "linear" }} />
    </motion.div>
  );
}

function Expanded({ s, d, selectedAgentId, onSelect }: { s: State; d: Dispatch<Action>; selectedAgentId: string; onSelect: (id: string) => void }) {
  const [tab, setTab] = useState<Tab>("Agents");
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [user, setUser] = useState<{ displayName: string; email: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("researcher");
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: string; name: string }>>([]);
  const selected = s.agents.find((agent) => agent.id === selectedAgentId) ?? s.agents[0];
  const native = typeof window !== "undefined" ? window.agentNative : undefined;
  useEffect(() => { setSelectedAgent(selectedAgentId); }, [selectedAgentId]);
  const refreshAgents = () => { if (native) void native.listAgents().then((result) => { if (result.agents) setAvailableAgents(result.agents); }); };
  useEffect(() => { if (native) void native.session().then((result) => { if (result.user) { setUser(result.user); refreshAgents(); } }); }, [native]);
  if (native && !user) return (
    <motion.div className="exp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="exp-head"><div className="row"><img src={LOGO} alt="" className="mini-logo" /><b>AGENT</b><span className="muted">Sign in to your workspace</span></div><button className="x" aria-label="Collapse" onClick={() => d({ type: "EXPAND", value: false })}>✕</button></div>
      <form className="exp-input" onSubmit={async (event) => { event.preventDefault(); setAuthError(""); const result = await native.login(email, password); if (result.user) { setUser(result.user); setPassword(""); refreshAgents(); } else setAuthError(result.error ?? "Authentication failed"); }}>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" aria-label="Email" autoComplete="email" />
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" aria-label="Password" autoComplete="current-password" />
        <button type="submit" aria-label="Sign in">→</button>
      </form>
      {authError && <div className="muted small" role="alert">{authError}</div>}
    </motion.div>
  );
  return (
    <motion.div className="exp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
      <div className="exp-head">
        <div className="row"><img src={LOGO} alt="" className="mini-logo" /><b>AGENT</b><span className="muted">{s.approvals.length ? `${s.approvals.length} waiting for you` : "everything is under control"}</span></div>
        <div className="row tabs-scroll">{(["Overview", "Agents", "Tasks", "Activity", "Skills", "MCP", "Prompts"] as Tab[]).map((t) => <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}<button className="x" aria-label="Collapse" onClick={() => d({ type: "EXPAND", value: false })}>✕</button></div>
      </div>
      <div className="exp-body">
        {s.approvals.map((a) => (
          <div key={a.id} className={`mini-appr tone-${RISK_TONE[a.risk]}`}>
            <div><b>{a.title}</b><div className="alert-sub"><span className="mono">{a.action}</span> · {a.target}</div></div>
            <div className="row"><button className="b-yes sm" onClick={() => { blip("ok"); d({ type: "DECIDE", id: a.id, ok: true }); }}>{a.yes}</button><button className="b-no sm" onClick={() => { blip("no"); d({ type: "DECIDE", id: a.id, ok: false }); }}>{a.no}</button></div>
          </div>
        ))}
        {tab === "Overview" && (
          <div className="overview-grid">
            <div className="overview-card overview-wide"><span className="muted small">Workspace status</span><b>All systems operational</b><span className="st st-completed"><i />Policy gateway connected</span></div>
            <button className="overview-card overview-action" onClick={() => setTab("Agents")}><span className="overview-icon">◉</span><b>{availableAgents.length || s.agents.length} agents</b><span className="muted small">View and select an agent →</span></button>
            <button className="overview-card overview-action" onClick={() => setTab("Tasks")}><span className="overview-icon">✓</span><b>{s.step >= 0 ? "1 active task" : "No active tasks"}</b><span className="muted small">Open task center →</span></button>
            <button className="overview-card overview-action" onClick={() => setTab("Activity")}><span className="overview-icon">↯</span><b>{s.log.length} activity events</b><span className="muted small">Review recent activity →</span></button>
          </div>
        )}
        {tab === "Agents" && (
          <div className="agent-detail">
            {selected && <div className="agent-detail-hero"><Orb hue={selected.hue} state={selected.state} size={64} /><div><span className="muted small">Selected agent</span><h2>{selected.name}</h2><p className="muted">{selected.role}</p><span className={`st st-${selected.state}`}><i />{selected.doing}</span></div></div>}
            <div className="agent-grid">{s.agents.map((a, i) => (
            <motion.button key={a.id} className={`agent-card st-${a.state} ${a.id === selectedAgentId ? "selected" : ""}`} onClick={() => { onSelect(a.id); setSelectedAgent(a.id); }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }} whileHover={{ y: -3 }}>
              <Orb hue={a.hue} state={a.state} size={46} />
              <div><b>{a.name}</b><div className="muted small">{a.role}</div><div className={`st st-${a.state}`}><i />{a.doing}</div></div>
            </motion.button>))}</div>
            {selected && <div className="agent-tools"><div className="agent-tool-card"><b>Skills</b><span>Web research · Document analysis</span></div><div className="agent-tool-card"><b>MCP</b><span>Documentation tools · read-only</span></div><div className="agent-tool-card"><b>Prompt</b><span>Research analyst v3 · published</span></div></div>}
          </div>
        )}
        {tab === "Tasks" && (
          <div className="task">
            <b>Weekly competitive report</b><div className="muted small" style={{ marginBottom: 12 }}>Budget $0.80 · 4 steps</div>
            {TASK_STEPS.map((t, i) => { const cls = i < s.step ? "done" : i === s.step ? "run" : ""; return (
              <div key={t} className={`tstep ${cls}`}><span className="tic">{cls === "done" ? "✓" : cls === "run" ? "●" : "○"}</span><span>{t}</span></div>); })}
          </div>
        )}
        {tab === "Activity" && (
          <div className="feed">{s.log.length === 0 && <div className="muted">No activity yet — use the demo controls.</div>}
            {[...s.log].reverse().map((l) => <div key={l.id} className={`fl tone-${l.tone}`}><span className="mono muted">{l.t}</span><span>{l.text}</span></div>)}</div>
        )}
        {tab === "Skills" && <div className="desktop-library"><div className="library-head"><b>Skills</b><button className="b-mod">Manage</button></div><div className="library-item"><b>Web research</b><span>Search and cite sources</span><i className="st st-completed">Enabled</i></div><div className="library-item"><b>Code execution</b><span>Run isolated analysis jobs</span><i>Available</i></div><div className="library-item"><b>Document analysis</b><span>Extract structured context</span><i>Available</i></div></div>}
        {tab === "MCP" && <div className="desktop-library"><div className="library-head"><b>MCP servers</b><button className="b-mod">Add server</button></div><div className="library-item"><b>Documentation tools</b><span>8 tools · read-only</span><i className="st st-completed">Connected</i></div><div className="library-item"><b>GitHub workspace</b><span>12 tools · writes gated</span><i className="st st-waiting">Approval required</i></div></div>}
        {tab === "Prompts" && <div className="desktop-library"><div className="library-head"><b>Prompt library</b><button className="b-mod">New prompt</button></div><div className="library-item"><b>Research analyst v3</b><span>Researcher · published today</span><i className="st st-completed">Published</i></div><div className="library-item"><b>Secure coding reviewer</b><span>Developer · draft</span><i>Draft</i></div></div>}
      </div>
      {reply && <div className="agent-reply"><b>{availableAgents.find((a) => a.id === selectedAgent)?.name ?? "Agent"}</b><span>{reply}</span></div>}
      <form className="exp-input" onSubmit={async (e) => { e.preventDefault(); const question = text.trim(); if (!question) return; d({ type: "ASK", text: question }); setText(""); setReply("Thinking…"); blip("open"); if (native) { const result = await native.ask(question, selectedAgent); setReply(result.content ?? `Request failed: ${result.error ?? "unknown_error"}`); } else setReply("Desktop companion preview: connect the API to enable live answers."); }}>
        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} aria-label="Select agent">{(availableAgents.length ? availableAgents : [{ id: "researcher", name: "Researcher" }]).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask the selected agent…" aria-label="Ask an agent" /><button type="submit" aria-label="Send">↑</button>
      </form>
    </motion.div>
  );
}

export function Island({ s, d }: { s: State; d: Dispatch<Action> }) {
  const [selectedAgentId, setSelectedAgentId] = useState("researcher");
  const mode = modeOf(s); const z = SIZE[mode];
  return (
    <motion.div className={`island mode-${mode}`} layout={false}
      animate={{ width: z.w, height: z.h, borderBottomLeftRadius: z.r, borderBottomRightRadius: z.r, boxShadow: shadowOf(mode) }}
      transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.9 }}
      onClick={() => { if (mode === "idle" || mode === "compact") { blip("open"); d({ type: "EXPAND", value: true }); } }}
      role="button" aria-label="AGENT companion">
      <div className="island-in">
        <AnimatePresence mode="wait" initial={false}>
          {(mode === "idle" || mode === "compact" || mode === "celebrate") && <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Summary s={s} onSelect={(id) => { setSelectedAgentId(id); d({ type: "EXPAND", value: true }); }} /></motion.div>}
          {mode === "alert" && <motion.div key="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Summary s={s} onSelect={(id) => { setSelectedAgentId(id); d({ type: "EXPAND", value: true }); }} /><AlertCard s={s} d={d} /></motion.div>}
          {mode === "expanded" && <motion.div key="exp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Expanded s={s} d={d} selectedAgentId={selectedAgentId} onSelect={setSelectedAgentId} /></motion.div>}
        </AnimatePresence>
      </div>
      {mode === "celebrate" && <Confetti key={s.celebrate} />}
    </motion.div>
  );
}
