"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Palette } from "./Palette";
import { useChat, type ConversationSummary } from "./chat-context";
import { Icon, type IconName } from "./Icon";

const GROUPS = ["Today", "Yesterday", "Previous 7 days"] as const;
const RAIL = [
  { href: "/chat", icon: "message" as IconName, label: "Chats" },
  { href: "/agents", icon: "bot" as IconName, label: "Agents" },
  { href: "/workspace", icon: "briefcase" as IconName, label: "Workspace" },
  { href: "/tasks", icon: "tasks" as IconName, label: "Tasks" },
  { href: "/knowledge", icon: "book" as IconName, label: "Knowledge" },
  { href: "/integrations", icon: "command" as IconName, label: "Integrations" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { activeId, setActiveId, filter, setFilter, conversations, setConversations } = useChat();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me").then(async (response) => response.ok ? (await response.json()) as { tenantId: string; displayName: string; email: string } : null).then((user) => {
      if (user?.tenantId) return fetch(`/api/conversations?tenantId=${encodeURIComponent(user.tenantId)}`).then(async (response) => response.ok ? (await response.json()).conversations as ConversationSummary[] : []);
      return [];
    }).then(setConversations).catch(() => setConversations([]));
  }, [setConversations]);
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
  const convs = useMemo(() => conversations.filter((c) => c.title.toLowerCase().includes(filter.toLowerCase())), [conversations, filter]);
  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <AnimatePresence initial={false}>
        <>
          <nav className="app-rail" aria-label="Primary navigation">
            <button className="rail-brand" aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)}><img src="/logo.png" alt="AGENT" /><span className="rail-collapse"><Icon name={collapsed ? "chevron-right" : "chevron-left"} size={18} /></span></button>
            <button className="rail-link rail-new-chat" title="New chat" aria-label="New chat" onClick={newChat}><Icon name="edit" size={17} /></button>
            <div className="rail-links">{RAIL.map((item) => <Link key={item.href} href={item.href} className={`rail-link ${path.startsWith(item.href) ? "active" : ""}`} title={item.label} aria-label={item.label}><Icon name={item.icon} size={17} /></Link>)}</div>
            <div className="rail-bottom"><button className="rail-link" title="Settings" aria-label="Settings"><Icon name="settings" size={17} /></button></div>
          </nav>
          {!collapsed && <motion.aside className="sidebar" aria-label="Sidebar" initial={{ width: 0, opacity: 0 }} animate={{ width: 308, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            <div className="side-in">
              <div className="side-top">
                <button className="sidebar-heading" aria-label="Select project"><span>Projects</span><span className="sidebar-heading-chevron"><Icon name="chevron-down" size={13} /></span></button>
                <button className="icon-btn project-files" title="Project files" aria-label="Project files"><Icon name="folder" size={16} /></button>
              </div>
              <button className="new-project" onClick={() => { setActiveId(null); router.push("/workspace"); }}><span><Icon name="plus" size={15} /></span>New project</button>
              <div className="conversations-heading"><span>Conversations</span><button className="icon-btn" title="Filter conversations" aria-label="Filter conversations" onClick={() => setOpen(true)}><Icon name="sliders" size={15} /></button></div>
              <label className="side-search">
                <Icon name="search" size={15} />
                <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
                {filter && <button type="button" className="search-clear" onClick={() => setFilter("")} aria-label="Clear search"><Icon name="close" size={13} /></button>}
              </label>
              <div className="side-scroll">
                {GROUPS.map((g) => {
                  const list = convs.filter((c) => {
                    const age = Date.now() - new Date(c.updatedAt).getTime();
                    return g === "Today" ? age < 86_400_000 : g === "Yesterday" ? age < 172_800_000 : true;
                  });
                  if (!list.length) return null;
                  return (
                    <div key={g} className="conv-group"><div className="conv-label">{g}</div>
                      {list.map((c) => (
                        <button key={c.id} className={`conv ${path === "/chat" && activeId === c.id ? "on" : ""}`} onClick={() => openChat(c.id)}><span className="conv-t">{c.title}</span></button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.aside>}
        </>
      </AnimatePresence>
      <div className="main">
        <div className="content">{children}</div>
      </div>
      <Palette open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
