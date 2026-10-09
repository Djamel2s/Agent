"use client";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { AgentState } from "../lib/demo";

const LABEL: Record<AgentState, string> = { working: "Working", waiting: "Waiting", reviewing: "Reviewing", idle: "Idle", completed: "Completed" };

export function StatusDot({ state, label = true }: { state: AgentState; label?: boolean }) {
  return (
    <span className={`status s-${state}`}>
      <span className="dot" />
      {label && LABEL[state]}
    </span>
  );
}

export function Badge({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      <div className="row">{actions}</div>
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  );
}

export function Avatar({ name, hue }: { name: string; hue: number }) {
  return <span className="avatar" style={{ background: `hsl(${hue} 70% 45% / .25)`, color: `hsl(${hue} 85% 70%)`, borderColor: `hsl(${hue} 70% 45% / .5)` }}>{name.slice(0, 1)}</span>;
}
