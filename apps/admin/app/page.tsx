"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const TABS = ["Overview", "Users & roles", "Policies", "Audit", "Usage & budgets", "Kill switch"] as const;
type Tab = (typeof TABS)[number];

const USERS = [{ n: "Alice Martin", r: "Owner", g: "Platform", mfa: true }, { n: "Karim B.", r: "Admin", g: "Security", mfa: true }, { n: "Sophie L.", r: "Member", g: "Product", mfa: false }, { n: "Demo Bot", r: "Viewer", g: "—", mfa: false }];
const POLICIES = [{ res: "GitHub", read: "ALLOW", analyze: "ALLOW", write: "APPROVAL", act: "DENY" }, { res: "Email", read: "ALLOW", analyze: "ALLOW", write: "APPROVAL", act: "APPROVAL" }, { res: "Database", read: "ALLOW", analyze: "ALLOW", write: "DENY", act: "DENY" }];
const AUDIT = [
  { t: "10:47:12", who: "Developer (agent)", action: "github.write", decision: "APPROVAL", result: "pending" },
  { t: "10:45:03", who: "Security Reviewer", action: "sast_scan", decision: "ALLOW", result: "ok" },
  { t: "10:44:51", who: "Researcher", action: "web_search", decision: "ALLOW", result: "ok" },
  { t: "10:41:20", who: "Report Writer", action: "send_email", decision: "DENY", result: "blocked by DLP" },
];
const KILLS = ["Entire platform", "Organization: Demo Org", "Agent: Developer", "Integration: GitHub", "Automation: Weekly report"];

const tone = (d: string) => (d === "ALLOW" ? "ok" : d === "DENY" ? "bad" : "warn");

export default function Admin() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [killed, setKilled] = useState<Record<string, boolean>>({});
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><img src="/logo.png" alt="" /><span>ADMIN</span></div>
        {TABS.map((t) => (
          <button key={t} className={`nav ${tab === t ? "active" : ""}`} onClick={() => setTab(t)} style={{ background: "none", border: 0, textAlign: "left" }}>
            {tab === t && <motion.span layoutId="pill" className="nav-pill" />}<span className="nav-tx">{t}</span>
          </button>
        ))}
        <div className="side-foot"><span className="dot ok" /> Demo organization</div>
      </aside>
      <div className="main">
        <div className="demo-banner">Design preview — demo data only. Changes here do not affect anything.</div>
        <div className="content"><motion.div key={tab} className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="page-head"><div><h1>{tab}</h1></div></div>
          {tab === "Overview" && (
            <div className="grid g3">
              {[["Users", "24"], ["Active agents", "5"], ["Tasks today", "37"], ["Approvals pending", "2"], ["Denied by policy (24h)", "11"], ["Spend this month", "$18.40 (demo)"]].map(([k, v]) => (
                <div key={k} className="card"><div className="muted small">{k}</div><div className="stat">{v}</div></div>
              ))}
            </div>
          )}
          {tab === "Users & roles" && (<div className="card"><table><thead><tr><th>Name</th><th>Role</th><th>Group</th><th>MFA</th></tr></thead><tbody>
            {USERS.map((u) => (<tr key={u.n}><td>{u.n}</td><td><span className="badge brand">{u.r}</span></td><td>{u.g}</td><td><span className={`badge ${u.mfa ? "ok" : "warn"}`}>{u.mfa ? "On" : "Off"}</span></td></tr>))}</tbody></table></div>)}
          {tab === "Policies" && (<div className="card"><table><thead><tr><th>Resource</th><th>READ</th><th>ANALYZE</th><th>WRITE</th><th>ACT</th></tr></thead><tbody>
            {POLICIES.map((p) => (<tr key={p.res}><td><b>{p.res}</b></td>{[p.read, p.analyze, p.write, p.act].map((d, i) => (<td key={i}><span className={`badge ${tone(d)}`}>{d}</span></td>))}</tr>))}</tbody></table></div>)}
          {tab === "Audit" && (<div className="card"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Decision</th><th>Result</th></tr></thead><tbody>
            {AUDIT.map((a) => (<tr key={a.t}><td className="mono">{a.t}</td><td>{a.who}</td><td className="mono">{a.action}</td><td><span className={`badge ${tone(a.decision)}`}>{a.decision}</span></td><td>{a.result}</td></tr>))}</tbody></table></div>)}
          {tab === "Usage & budgets" && (<div className="grid g3">{[["Researcher", 62], ["Developer", 35], ["Security Reviewer", 48]].map(([n, p]) => (
            <div key={n} className="card"><b>{n}</b><div className="muted small">Monthly budget used (demo)</div>
              <div style={{ height: 8, background: "var(--line2)", borderRadius: 8, marginTop: 10 }}><motion.div style={{ height: 8, borderRadius: 8, background: "var(--brand)" }} initial={{ width: 0 }} animate={{ width: `${p}%` }} /></div></div>))}</div>)}
          {tab === "Kill switch" && (<div className="grid" style={{ maxWidth: 640 }}><AnimatePresence>{KILLS.map((k) => (
            <div key={k} className={`card ${killed[k] ? "kill" : ""}`}><div className="row" style={{ justifyContent: "space-between" }}><b>{k}</b>
              <button className={`btn ${killed[k] ? "" : "danger"}`} onClick={() => setKilled((s) => ({ ...s, [k]: !s[k] }))}>{killed[k] ? "Restore (demo)" : "Stop (demo)"}</button></div></div>))}</AnimatePresence></div>)}
        </motion.div></div>
      </div>
    </div>
  );
}
