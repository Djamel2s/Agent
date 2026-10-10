"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ACTIVITY, AGENTS, APPROVALS, LIVE_EVENTS, MEMORIES, TASKS } from "../../../lib/demo";
import { Avatar, Badge, StatusDot } from "../../../components/ui";
import { ConnectorGraph } from "../../../components/ConnectorGraph";

type Tab = "Context" | "Memory" | "Approvals";
const SOURCES = ["Conversation", "Memory", "Knowledge base", "GitHub", "Slack", "MCP: docs"];

export default function WorkspacePage() {
  const task = TASKS[0]!;
  const [step, setStep] = useState(2);
  const [feed, setFeed] = useState(ACTIVITY.slice().reverse().map((a, i) => ({ ...a, id: `s${i}` })));
  const [tab, setTab] = useState<Tab>("Context");
  const [ctx, setCtx] = useState<Record<string, boolean>>(Object.fromEntries(SOURCES.map((s) => [s, true])));

  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      const ev = LIVE_EVENTS[n % LIVE_EVENTS.length]!;
      const d = new Date();
      setFeed((f) => [{ ...ev, id: `l${n}-${Date.now()}`, time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }, ...f].slice(0, 12));
      if (n % 3 === 2) setStep((s) => (s + 1) % (task.steps.length + 1));
      n++;
    }, 3200);
    return () => clearInterval(t);
  }, [task.steps.length]);

  return (
    <div className="ws">
      <div className="ws-col">
        <div className="presence">
          {AGENTS.map((a) => (
            <motion.div key={a.id} layout className={`pres ${a.state}`} whileHover={{ y: -2 }}>
              <div className="row"><Avatar name={a.name} hue={a.hue} /><div><b>{a.name}</b><div className="muted small">{a.role}</div></div></div>
              <StatusDot state={a.state} />
              <div className="small muted">{a.doing}</div>
            </motion.div>
          ))}
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <div><b>Task: {task.title}</b><div className="muted small">Researcher · {task.budget}</div></div>
            <Badge tone="brand">{step >= task.steps.length ? "Completed" : "Running"}</Badge>
          </div>
          <div className="timeline">
            {task.steps.map((s, i) => {
              const cls = i < step ? "done" : i === step ? "run" : "";
              return (
                <div key={s.id} className={`step ${cls}`}>
                  <div className="step-ic">{i < step ? "✓" : i === step ? "●" : "○"}</div>
                  <div><div className="step-t">{s.title}</div><div className="step-d">{s.agent} · {s.detail}</div></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <b>Connections</b><div className="muted small" style={{ marginBottom: 6 }}>Agents reach tools only through the gateway and policy engine.</div>
          <ConnectorGraph />
        </div>

        <div className="card">
          <b>Live activity</b>
          <div className="feed" style={{ marginTop: 8 }}>
            <AnimatePresence initial={false}>
              {feed.map((e) => (
                <motion.div key={e.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className={`feed-item k-${e.kind}`}>
                  <span className="muted mono small">{e.time}</span><span className="kdot" /><span><b>{e.agent}</b> {e.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <aside className="dock">
        <div className="tabs">{(["Context", "Memory", "Approvals"] as Tab[]).map((t) => (<button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>))}</div>
        <div className="dock-body">
          {tab === "Context" && (<><div className="muted small">Where the agent’s context comes from. Remove a source to exclude it.</div>
            {SOURCES.map((s) => (<div className="ctx" key={s}><span>{s}</span><button className={`switch ${ctx[s] ? "on" : ""}`} aria-pressed={ctx[s]} aria-label={s} onClick={() => setCtx((c) => ({ ...c, [s]: !c[s] }))} /></div>))}</>)}
          {tab === "Memory" && MEMORIES.map((m) => (<div key={m.id} className="ctx" style={{ display: "block" }}><Badge>{m.scope}</Badge><div style={{ margin: "6px 0 2px" }}>{m.text}</div><div className="muted small">{m.source} · {m.time}</div></div>))}
          {tab === "Approvals" && APPROVALS.map((a) => (<div key={a.id} className="ctx" style={{ display: "block" }}><b>{a.title}</b><div className="muted small">{a.action} · {a.by} · {a.target}</div><div style={{ marginTop: 6 }}><Badge tone={a.risk === "HIGH" ? "bad" : "warn"}>{a.risk}</Badge></div></div>))}
        </div>
      </aside>
    </div>
  );
}
