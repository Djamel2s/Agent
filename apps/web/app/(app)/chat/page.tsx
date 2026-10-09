"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AGENTS, CHATS, MODELS, SUGGESTIONS, type ChatMsg } from "../../../lib/demo";
import { Markdown } from "../../../components/Markdown";
import { useChat } from "../../../components/chat-context";

const REPLY = "This is a **demo** of a streamed answer. In the real product the text comes from the Model Gateway, tool calls pass through the policy engine, and long results land in an artifact.\n\n- Sources are filtered by your permissions\n- Sensitive actions wait for approval";

function Selector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sel-wrap">
      <button className="sel-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>{value} <span className="muted">▾</span></button>
      <AnimatePresence>
        {open && (
          <motion.div className="sel-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} role="listbox">
            <div className="conv-label">Models</div>
            {MODELS.map((m) => <button key={m} role="option" aria-selected={m === value} onClick={() => { onChange(m); setOpen(false); }}>{m}{m !== "Auto (router)" && <span className="badge">Not configured</span>}</button>)}
            <div className="conv-label">Agents</div>
            {AGENTS.map((a) => <button key={a.id} role="option" aria-selected={a.name === value} onClick={() => { onChange(a.name); setOpen(false); }}>{a.name}</button>)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatPage() {
  const { activeId } = useChat();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [typed, setTyped] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("Auto (router)");
  const [tools, setTools] = useState<Record<string, boolean>>({ "Web search": true, Code: false, MCP: false });
  const [artifact, setArtifact] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const partial = useRef("");
  const end = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const busy = typed !== null;

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    setTyped(null); setArtifact(null);
    setMsgs(activeId ? (CHATS.find((c) => c.id === activeId)?.messages ?? []) : []);
  }, [activeId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typed]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => { if (ta.current) { ta.current.style.height = "auto"; ta.current.style.height = `${Math.min(ta.current.scrollHeight, 200)}px`; } }, [input]);

  const finish = (done: boolean) => {
    if (timer.current) clearInterval(timer.current);
    setMsgs((m) => [...m, { role: "assistant", text: done ? REPLY : partial.current || "(stopped)", tool: tools["Web search"] ? "web_search · 2 results (demo)" : undefined }]);
    setTyped(null);
  };
  const send = (text = input) => {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput(""); setTyped(""); partial.current = "";
    let i = 0;
    timer.current = setInterval(() => { i += 4; partial.current = REPLY.slice(0, i); setTyped(partial.current); if (i >= REPLY.length) finish(true); }, 28);
  };

  return (
    <div className={`chat ${artifact ? "with-art" : ""}`}>
      <div className="chat-main">
        <header className="chat-head"><Selector value={model} onChange={setModel} /></header>
        <div className="msgs">
          {msgs.length === 0 && typed === null ? (
            <div className="hero">
              <motion.img src="/logo.png" alt="" width={64} height={64} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 120 }} />
              <h1>How can I help you today?</h1>
              <div className="sugg">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button key={s.title} className="sugg-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} onClick={() => send(s.title)}>
                    <b>{s.title}</b><span>{s.sub}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="thread">
              {msgs.map((m, i) => (
                <motion.div key={i} className={`m ${m.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {m.role === "assistant" && <img className="m-av" src="/logo.png" alt="" />}
                  <div className="m-body">
                    {m.tool && <details className="tool"><summary>⚙ Used <b>{m.tool.split(" · ")[0]}</b><span className="muted"> · {m.tool.split(" · ").slice(1).join(" · ")}</span><span className="badge ok">Allowed by policy</span></summary><div className="tool-in muted small">Call routed through the MCP/tool gateway → policy engine → audit (demo).</div></details>}
                    {m.role === "user" ? <div className="bubble">{m.text}</div> : <Markdown text={m.text} />}
                    {m.artifact && <button className="art-chip" onClick={() => setArtifact(m.artifact ?? null)}>📄 {m.artifact}<span className="muted small">Open artifact</span></button>}
                    <div className="m-actions">
                      <button title="Copy" onClick={() => void navigator.clipboard?.writeText(m.text)}>⧉</button>
                      {m.role === "user" ? <button title="Edit" onClick={() => setInput(m.text)}>✎</button> : <><button title="Regenerate" onClick={() => send("Regenerate")}>↻</button><button title="Good">👍</button><button title="Bad">👎</button></>}
                    </div>
                  </div>
                </motion.div>
              ))}
              {typed !== null && (
                <div className="m assistant"><img className="m-av" src="/logo.png" alt="" /><div className="m-body"><Markdown text={typed || "…"} /><span className="cursor" /></div></div>
              )}
              <div ref={end} />
            </div>
          )}
        </div>
        <div className="composer-wrap">
          <div className="composer">
            <textarea ref={ta} rows={1} value={input} placeholder="Message AGENT (demo)" aria-label="Message" onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <div className="composer-bar">
              <div className="row" style={{ gap: 6 }}>
                <button className="icon-btn round" title="Attach files" aria-label="Attach files">＋</button>
                {Object.keys(tools).map((t) => <button key={t} className={`chip ${tools[t] ? "on" : ""}`} aria-pressed={tools[t]} onClick={() => setTools((s) => ({ ...s, [t]: !s[t] }))}>{t}</button>)}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="icon-btn round" title="Voice" aria-label="Voice">🎙</button>
                {busy ? <button className="send stop" aria-label="Stop generating" onClick={() => finish(false)}>■</button>
                  : <button className="send" aria-label="Send" disabled={!input.trim()} onClick={() => send()}>↑</button>}
              </div>
            </div>
          </div>
          <div className="foot-note">Demo mode — AGENT does not call a real model here. Check important information.</div>
        </div>
      </div>
      <AnimatePresence>
        {artifact && (
          <motion.aside className="art-panel" initial={{ width: 0, opacity: 0 }} animate={{ width: 420, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="art-in">
              <div className="art-head"><b>{artifact}</b><div className="row"><span className="badge">v1</span><button className="icon-btn" aria-label="Close artifact" onClick={() => setArtifact(null)}>✕</button></div></div>
              <div className="art-body"><Markdown text={"# Weekly competitive report\n\nDemo artifact produced by the **Researcher** agent.\n\n| Competitor | News |\n|---|---|\n| Acme | New pricing tier |\n| Globex | Series B (fictional) |\n\n- Version history, edit and download are part of the Artifact system."} /></div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
