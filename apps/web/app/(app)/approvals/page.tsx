"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { APPROVALS } from "../../../lib/demo";
import { Badge, Page, PageHeader } from "../../../components/ui";

export default function ApprovalsPage() {
  const [items, setItems] = useState(APPROVALS.map((a) => ({ ...a, result: "" })));
  const decide = (id: string, result: string) => setItems((l) => l.map((x) => (x.id === id ? { ...x, result } : x)));
  return (
    <Page>
      <PageHeader title="Approval Center" sub="Sensitive actions wait here until a human decides." />
      <div className="grid" style={{ maxWidth: 760 }}>
        <AnimatePresence>
          {items.map((a) => (
            <motion.div key={a.id} layout className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="row" style={{ justifyContent: "space-between" }}><b>{a.title}</b><Badge tone={a.risk === "HIGH" ? "bad" : "warn"}>Risk: {a.risk}</Badge></div>
              <div className="muted small" style={{ margin: "6px 0 12px" }}>Action <span className="mono">{a.action}</span> · requested by {a.by} · target {a.target}</div>
              {a.result ? <Badge tone={a.result === "Approved" ? "ok" : "bad"}>{a.result} (demo)</Badge> : (
                <div className="row"><button className="btn primary" onClick={() => decide(a.id, "Approved")}>Approve</button><button className="btn danger" onClick={() => decide(a.id, "Rejected")}>Reject</button><button className="btn">Modify</button></div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Page>
  );
}
