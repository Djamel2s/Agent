"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NAV } from "../lib/nav";

const ACTIONS = [
  { label: "New chat", href: "/chat" },
  ...NAV.map((n) => ({ label: `Open ${n.label}`, href: n.href })),
  { label: "Create a Task", href: "/tasks" }, { label: "Create Agent", href: "/agents" },
  { label: "Connect GitHub", href: "/integrations" }, { label: "Ask Security Agent", href: "/chat" },
  { label: "Open Memory", href: "/memory" },
];

export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const items = useMemo(() => ACTIONS.filter((a) => a.label.toLowerCase().includes(q.toLowerCase())), [q]);

  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => ref.current?.focus(), 30); } }, [open]);
  const go = (href: string) => { onClose(); router.push(href); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="palette" initial={{ y: -12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
            <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} placeholder="Type a command…"
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
                if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
                if (e.key === "Enter") { const it = items[idx]; if (it) go(it.href); }
              }} />
            <div className="pal-list">
              {items.map((a, i) => (
                <button key={a.label} className={i === idx ? "sel" : ""} onMouseEnter={() => setIdx(i)} onClick={() => go(a.href)}>{a.label}</button>
              ))}
              {items.length === 0 && <div className="empty">No results</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
