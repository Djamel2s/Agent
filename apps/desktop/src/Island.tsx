import { useState, type Dispatch } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Orb } from "./Orb";
import { Confetti } from "./Confetti";
import { blip } from "./sound";
import { modeOf, TASK_STEPS, type Action, type Mode, type State } from "./store";

const LOGO = `${import.meta.env.BASE_URL}logo.png`;
const SIZE: Record<Mode, { w: number; h: number; r: number }> = {
  idle: { w: 196, h: 32, r: 16 }, compact: { w: 392, h: 42, r: 21 }, celebrate: { w: 392, h: 42, r: 21 },
  alert: { w: 580, h: 176, r: 30 }, expanded: { w: 660, h: 470, r: 34 },
};
const GLOW: Record<Mode, string> = { idle: "0 0 0 rgba(0,0,0,0)", compact: "0 0 40px -8px rgba(8,150,255,.55)", celebrate: "0 0 60px -4px rgba(53,208,127,.8)", alert: "0 0 70px -6px rgba(245,185,66,.7)", expanded: "0 0 70px -20px rgba(8,150,255,.5)" };
const RISK_TONE: Record<string, string> = { LOW: "ok", MEDIUM: "warn", HIGH: "bad", CRITICAL: "crit" };
type Tab = "Agents" | "Tasks" | "Activity";

function Summary({ s }: { s: State }) {
  const working = s.agents.filter((a) => a.state === "working" || a.state === "reviewing").length;
  const waiting = s.approvals.length;
  return (
    <div className="summary">
      <img src={LOGO} alt="" className="mini-logo" />
      <div className="orbs">{s.agents.map((a) => <Orb key={a.id} hue={a.hue} state={a.state} size={24} />)}</div>
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

function Expanded({ s, d }: { s: State; d: Dispatch<Action> }) {
  const [tab, setTab] = useState<Tab>("Agents");
  const [text, setText] = useState("");
  return (
    <motion.div className="exp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
      <div className="exp-head">
        <div className="row"><img src={LOGO} alt="" className="mini-logo" /><b>AGENT</b><span className="muted">{s.approvals.length ? `${s.approvals.length} waiting for you` : "everything is under control"}</span></div>
        <div className="row">{(["Agents", "Tasks", "Activity"] as Tab[]).map((t) => <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}<button className="x" aria-label="Collapse" onClick={() => d({ type: "EXPAND", value: false })}>✕</button></div>
      </div>
      <div className="exp-body">
        {s.approvals.map((a) => (
          <div key={a.id} className={`mini-appr tone-${RISK_TONE[a.risk]}`}>
            <div><b>{a.title}</b><div className="alert-sub"><span className="mono">{a.action}</span> · {a.target}</div></div>
            <div className="row"><button className="b-yes sm" onClick={() => { blip("ok"); d({ type: "DECIDE", id: a.id, ok: true }); }}>{a.yes}</button><button className="b-no sm" onClick={() => { blip("no"); d({ type: "DECIDE", id: a.id, ok: false }); }}>{a.no}</button></div>
          </div>
        ))}
        {tab === "Agents" && (
          <div className="agent-grid">{s.agents.map((a, i) => (
            <motion.div key={a.id} className={`agent-card st-${a.state}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }} whileHover={{ y: -3 }}>
              <Orb hue={a.hue} state={a.state} size={46} />
              <div><b>{a.name}</b><div className="muted small">{a.role}</div><div className={`st st-${a.state}`}><i />{a.doing}</div></div>
            </motion.div>))}</div>
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
      </div>
      <form className="exp-input" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { d({ type: "ASK", text: text.trim() }); setText(""); blip("open"); } }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask an agent… (prototype: simulated)" aria-label="Ask an agent" /><button type="submit" aria-label="Send">↑</button>
      </form>
    </motion.div>
  );
}

export function Island({ s, d }: { s: State; d: Dispatch<Action> }) {
  const mode = modeOf(s); const z = SIZE[mode];
  return (
    <motion.div className={`island mode-${mode}`} layout={false}
      animate={{ width: z.w, height: z.h, borderBottomLeftRadius: z.r, borderBottomRightRadius: z.r, boxShadow: `${GLOW[mode]}, 0 24px 60px rgba(0,0,0,.55)` }}
      transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.9 }}
      onClick={() => { if (mode === "idle" || mode === "compact") { blip("open"); d({ type: "EXPAND", value: true }); } }}
      role="button" aria-label="AGENT companion">
      <div className="island-in">
        <AnimatePresence mode="wait" initial={false}>
          {mode === "idle" && <motion.div key="idle" className="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.span className="idle-dot" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 3, repeat: Infinity }} /></motion.div>}
          {(mode === "compact" || mode === "celebrate") && <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Summary s={s} /></motion.div>}
          {mode === "alert" && <motion.div key="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Summary s={s} /><AlertCard s={s} d={d} /></motion.div>}
          {mode === "expanded" && <motion.div key="exp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Expanded s={s} d={d} /></motion.div>}
        </AnimatePresence>
      </div>
      {mode === "celebrate" && <Confetti key={s.celebrate} />}
    </motion.div>
  );
}
