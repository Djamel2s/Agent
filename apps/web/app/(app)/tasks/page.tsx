"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TASKS } from "../../../lib/demo";
import { Badge, Page, PageHeader } from "../../../components/ui";

const TONE = { Running: "brand", "Needs Approval": "warn", Completed: "ok", Queued: "", Failed: "bad" } as const;

export default function TasksPage() {
  const [sel, setSel] = useState(TASKS[0]!.id);
  const [step, setStep] = useState<number | null>(null);
  const [sim, setSim] = useState(false);
  const [note, setNote] = useState("");
  const task = TASKS.find((t) => t.id === sel)!;

  return (
    <Page>
      <PageHeader title="Tasks" sub="Durable work that outlives the conversation." actions={<button className="btn primary">+ New Task</button>} />
      <div className="split">
        <div>
          {TASKS.map((t) => (
            <button key={t.id} className={`list-item ${t.id === sel ? "on" : ""}`} onClick={() => { setSel(t.id); setStep(null); setSim(false); setNote(""); }}>
              <div className="row" style={{ justifyContent: "space-between" }}><b>{t.title}</b><Badge tone={TONE[t.status]}>{t.status}</Badge></div>
              <div className="muted small" style={{ marginTop: 4 }}>{t.agent} · {t.priority} · {t.id}</div>
            </button>
          ))}
        </div>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>{task.title}</h2><div className="muted small">Budget {task.budget}</div></div>
            <div className="row"><button className="btn" onClick={() => setSim((s) => !s)}>Simulate</button><button className="btn">Pause</button><button className="btn danger">Cancel</button></div>
          </div>
          <AnimatePresence>
            {sim && (
              <motion.div className="est" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: 14 }}>
                <b>Simulation (demo estimate)</b>
                <ul style={{ margin: "8px 0", paddingLeft: 18 }}>{task.steps.map((s) => <li key={s.id}>{s.title} — {s.detail}</li>)}</ul>
                <div className="row"><Badge>~4 min</Badge><Badge>~$0.42</Badge><Badge tone="warn">Risk: Medium</Badge></div>
                <div className="row" style={{ marginTop: 10 }}><button className="btn primary" onClick={() => { setSim(false); setNote("Demo: run requested — a real runtime does not exist yet."); }}>Run</button><button className="btn">Modify</button><button className="btn" onClick={() => setSim(false)}>Cancel</button></div>
              </motion.div>
            )}
          </AnimatePresence>
          {note && <div className="badge warn" style={{ display: "inline-block", marginBottom: 12 }}>{note}</div>}
          <div className="muted small" style={{ marginBottom: 8 }}>Replay — click a step to inspect (operational events only)</div>
          <div className="timeline">
            {task.steps.map((s, i) => {
              const cls = i <= task.progress ? "done" : i === task.progress + 1 && task.status === "Running" ? "run" : "";
              return (
                <div key={s.id} className={`step ${cls} ${step === i ? "sel" : ""}`} onClick={() => setStep(i)}>
                  <div className="step-ic">{cls === "done" ? "✓" : cls === "run" ? "●" : "○"}</div>
                  <div><div className="step-t">{s.title}</div><div className="step-d">{s.agent} · {s.detail}</div>
                    {step === i && <div className="row" style={{ marginTop: 8 }}><button className="btn" onClick={() => setNote(`Demo: would resume from “${s.title}”.`)}>Resume from this step</button><button className="btn" onClick={() => setNote(`Demo: would create a branch at “${s.title}”.`)}>Create branch</button></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Page>
  );
}
