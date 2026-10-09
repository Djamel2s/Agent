"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Palette } from "./Palette";
import { NAV } from "../lib/nav";
import { CHATS } from "../lib/demo";
import { useChat } from "./chat-context";
import { fetchProviders, type Provider } from "../lib/api";

const GROUPS = ["Today", "Yesterday", "Previous 7 days"] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { activeId, setActiveId, filter, setFilter } = useChat();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [providers, setProviders] = useState<Provider[] | null | undefined>(undefined);

  useEffect(() => { void fetchProviders().then(setProviders); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); newChat(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newChat = () => { setActiveId(null); router.push("/chat"); };
  const openChat = (id: string) => { setActiveId(id); router.push("/chat"); };
  const convs = useMemo(() => CHATS.filter((c) => c.title.toLowerCase().includes(filter.toLowerCase())), [filter]);
  const n = providers?.filter((p) => p.configured).length ?? 0;
  const api = providers === undefined ? "Checking API…" : providers === null ? "API offline" : n ? `${n} provider(s) configured` : "Provider not configured";

  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.aside className="sidebar" aria-label="Sidebar" initial={{ width: 0, opacity: 0 }} animate={{ width: 268, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            <div className="side-in">
              <div className="side-top">
                <Link href="/chat" className="brand" onClick={() => setActiveId(null)}><img src="/logo.png" alt="AGENT" /></Link>
                <div className="row" style={{ gap: 2 }}>
                  <button className="icon-btn" title="New chat (⇧⌘O)" aria-label="New chat" onClick={newChat}>✎</button>
                  <button className="icon-btn" title="Close sidebar" aria-label="Close sidebar" onClick={() => setCollapsed(true)}>⟨</button>
                </div>
              </div>
              <div className="side-search"><span>⌕</span><input placeholder="Search conversations" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search conversations" /><kbd onClick={() => setOpen(true)}>⌘K</kbd></div>
              <div className="side-scroll">
                {GROUPS.map((g) => {
                  const list = convs.filter((c) => c.group === g);
                  if (!list.length) return null;
                  return (
                    <div key={g} className="conv-group"><div className="conv-label">{g}</div>
                      {list.map((c) => (
                        <button key={c.id} className={`conv ${path === "/chat" && activeId === c.id ? "on" : ""}`} onClick={() => openChat(c.id)}><span className="conv-t">{c.title}</span></button>
                      ))}
                    </div>
                  );
                })}
                {convs.length === 0 && <div className="empty small">No conversations found</div>}
              </div>
              <div className="side-nav">
                <div className="conv-label">Agent Workspace</div>
                {NAV.map((i) => {
                  const active = path.startsWith(i.href);
                  return (
                    <Link key={i.href} href={i.href} className={`nav ${active ? "active" : ""}`}>
                      {active && <motion.span layoutId="nav-pill" className="nav-pill" />}
                      <span className="nav-ic">{i.icon}</span><span className="nav-tx">{i.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="side-foot"><span className="avatar sm">D</span><div><div>Demo user</div><div className="muted small">{api}</div></div></div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="main">
        <div className="demo-banner">Design preview — all data on screen is demo data. Nothing here talks to a real model or service.</div>
        {collapsed && <button className="icon-btn float-open" aria-label="Open sidebar" onClick={() => setCollapsed(false)}>☰</button>}
        <div className="content">{children}</div>
      </div>
      <Palette open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
