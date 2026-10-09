"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MEMORIES } from "../../../lib/demo";
import { Badge, Page, PageHeader } from "../../../components/ui";

export default function MemoryPage() {
  const [items, setItems] = useState(MEMORIES);
  return (
    <Page>
      <PageHeader title="Memory" sub="Everything agents remember — viewable, editable, deletable." />
      <div className="grid" style={{ maxWidth: 760 }}>
        <AnimatePresence>
          {items.map((m) => (
            <motion.div key={m.id} layout className="card" exit={{ opacity: 0, x: 30 }}>
              <div className="row" style={{ justifyContent: "space-between" }}><Badge tone="brand">{m.scope}</Badge><span className="muted small">{m.time}</span></div>
              <p style={{ margin: "10px 0" }}>{m.text}</p>
              <div className="row" style={{ justifyContent: "space-between" }}><span className="muted small">Source: {m.source}</span><div className="row"><button className="btn">Edit</button><button className="btn danger" onClick={() => setItems((l) => l.filter((x) => x.id !== m.id))}>Delete</button></div></div>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && <div className="empty">No memories left (demo).</div>}
      </div>
    </Page>
  );
}
