"use client";
import { motion } from "motion/react";
import { AGENTS } from "../../../lib/demo";
import { Avatar, Badge, Page, PageHeader, StatusDot } from "../../../components/ui";

export default function AgentsPage() {
  return (
    <Page>
      <PageHeader title="Agents" sub="Configurable entities with their own identity, tools and limits." actions={<button className="btn primary">+ Create agent</button>} />
      <div className="grid g3">
        {AGENTS.map((a, i) => (
          <motion.div key={a.id} className="card hover" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row"><Avatar name={a.name} hue={a.hue} /><div><b>{a.name}</b><div className="muted small">{a.role}</div></div></div>
              <StatusDot state={a.state} />
            </div>
            <div className="small muted" style={{ marginTop: 12 }}>Model</div><div>{a.model}</div>
            <div className="small muted" style={{ marginTop: 10 }}>Tools</div>
            <div className="tags">{a.tools.map((t) => <span key={t} className="tag mono">{t}</span>)}</div>
            <div className="small muted" style={{ marginTop: 10 }}>Skills</div>
            <div className="tags">{a.skills.map((t) => <span key={t} className="tag">{t}</span>)}</div>
            <div className="row" style={{ marginTop: 14 }}><Badge>Own identity</Badge><Badge>Policy-gated</Badge></div>
          </motion.div>
        ))}
      </div>
    </Page>
  );
}
