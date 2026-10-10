"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MODELS, readAgentAppearances, type ChatMsg } from "../../../lib/demo";
import { Markdown } from "../../../components/Markdown";
import { useChat } from "../../../components/chat-context";
import { Icon } from "../../../components/Icon";

type ChatAgent = { id: string; name: string; role: string; provider: string; model: string; hue: number };
function Selector({ value, onChange, agents }: { value: string; onChange: (v: string) => void; agents: ChatAgent[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sel-wrap">
      <button className="sel-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>{value} <Icon name="chevron-down" size={12} /></button>
      <AnimatePresence>
        {open && (
          <motion.div className="sel-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} role="listbox">
            <div className="conv-label">Agents</div>
            {agents.map((a) => <button key={a.id} role="option" aria-selected={a.id === value} onClick={() => { onChange(a.id); setOpen(false); }}>{a.name}</button>)}
            <div className="conv-label">Direct model gateway</div>
            {MODELS.filter((m) => m !== "Auto (router)").map((m) => <button key={m} role="option" aria-selected={m === value} onClick={() => { onChange(m); setOpen(false); }}>{m}<span className="badge">No agent</span></button>)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatPage() {
  const { activeId, setActiveId, setConversations } = useChat();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("researcher");
  const [appearances, setAppearances] = useState(readAgentAppearances);
  const [tools, setTools] = useState<Record<string, boolean>>({ "Web search": true, Code: false, MCP: false });
  const [artifact, setArtifact] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const busy = typed !== null;

  useEffect(() => {
    fetch("/api/auth/me").then(async (response) => response.ok ? (await response.json()).tenantId as string : null).then(setTenantId);
  }, []);
  useEffect(() => {
    fetch("/api/agents").then(async (response) => response.ok ? (await response.json()).agents as ChatAgent[] : []).then((loaded) => {
      setAgents(loaded);
      if (loaded.length && !loaded.some((agent) => agent.id === model)) setModel(loaded[0]?.id ?? "model-gateway");
    }).catch(() => setAgents([]));
  }, []);
  useEffect(() => {
    setTyped(null); setArtifact(null);
    if (!activeId || !tenantId) { setMsgs([]); return; }
    fetch(`/api/conversations/${encodeURIComponent(activeId)}?tenantId=${encodeURIComponent(tenantId)}`).then(async (response) => response.ok ? await response.json() as { messages: Array<{ role: "user" | "assistant"; content: string }> } : null).then((conversation) => {
      setMsgs(conversation?.messages.map((message) => ({ role: message.role, text: message.content })) ?? []);
    }).catch(() => setMsgs([]));
  }, [activeId, tenantId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typed]);
  useEffect(() => { if (ta.current) { ta.current.style.height = "auto"; ta.current.style.height = `${Math.min(ta.current.scrollHeight, 200)}px`; } }, [input]);
  useEffect(() => {
    const refresh = () => setAppearances(readAgentAppearances());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const selectedAgent = agents.find((a) => a.id === model);
  const selectedAppearance = selectedAgent ? appearances[selectedAgent.id] : undefined;

  const send = async (text = input) => {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput(""); setTyped("Connecting to the model gateway…");
    let conversationId = activeId;
    try {
      if (!tenantId) throw new Error("authentication_required");
      if (!conversationId) {
        const createdResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tenantId, agentId: selectedAgent?.id ?? "model-gateway", title: text.slice(0, 80) }),
        });
        if (!createdResponse.ok) throw new Error("conversation_create_failed");
        const created = await createdResponse.json() as { id: string; title: string; agentId: string; updatedAt: string };
        conversationId = created.id;
        setActiveId(created.id);
        setConversations((items) => [...items, created]);
      }
      const history = [...msgs, { role: "user" as const, text }].map((message) => ({ role: message.role, content: message.text }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantId,
          conversationId,
          agentId: selectedAgent?.id ?? "model-gateway",
          provider: model === "Gemini" ? "google" : model === "OpenAI" ? "openai" : undefined,
          model: model === "Gemini" || model === "OpenAI" || model === "Auto (router)" || selectedAgent ? undefined : model.toLowerCase(),
          messages: history,
        }),
      });
      const payload = await response.json() as { content?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "chat_failed");
      setMsgs((messages) => [...messages, { role: "assistant", text: payload.content ?? "The model returned no content." }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "chat_failed";
      setMsgs((messages) => [...messages, { role: "assistant", text: `**Chat unavailable**\n\nThe request was not completed: \`${message}\`. Configure a model provider on the server to continue.` }]);
    } finally {
      setTyped(null);
    }
  };

  return (
    <div className={`chat ${artifact ? "with-art" : ""} ${msgs.length === 0 && typed === null ? "empty" : ""}`}>
      <div className="chat-main">
        <header className="chat-head">
          <Selector value={selectedAgent?.name ?? model} onChange={setModel} agents={agents} />
          <button className="head-action" aria-label="Duplicate conversation" title="Duplicate conversation"><Icon name="clipboard" size={16} /></button>
          <button className="head-action" aria-label="New chat" title="New chat" onClick={() => { setActiveId(null); setMsgs([]); }}><Icon name="plus" size={17} /></button>
          {selectedAgent && <span className="chat-agent-badge"><span style={{ background: `hsl(${selectedAppearance?.hue ?? selectedAgent.hue} 70% 45% / .25)` }}>{selectedAppearance?.emoji || selectedAgent.name.slice(0, 1)}</span>{selectedAppearance?.label || selectedAgent.name}<small>· policy-gated</small></span>}
          <button className="head-menu" aria-label="More options" title="More options"><Icon name="more" size={19} /></button>
        </header>
        <div className="msgs">
          {msgs.length === 0 && typed === null ? (
            <div className="hero">
              <h1><motion.img src="/logo.png" alt="" width={28} height={28} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 120 }} />What are we tackling today?</h1>
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
                      {m.role === "user" ? <button title="Edit" onClick={() => setInput(m.text)}><Icon name="edit" size={15} /></button> : <><button title="Regenerate" onClick={() => send("Regenerate")}><Icon name="refresh" size={15} /></button><button title="Good"><Icon name="thumb-up" size={15} /></button><button title="Bad"><Icon name="thumb-down" size={15} /></button></>}
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
            <textarea ref={ta} rows={1} value={input} placeholder="Message AGENT" aria-label="Message" onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <div className="composer-bar">
              <div className="row" style={{ gap: 6 }}>
                <button className="icon-btn round" title="Attach files" aria-label="Attach files"><Icon name="paperclip" size={15} /></button>
                <button className={`icon-btn round composer-tools ${tools["Web search"] ? "on" : ""}`} title="Chat options" aria-label="Chat options" onClick={() => setTools((s) => ({ ...s, "Web search": !s["Web search"] }))}><Icon name="sliders" size={15} /></button>
                {Object.keys(tools).map((t) => <button key={t} className={`chip ${tools[t] ? "on" : ""}`} aria-pressed={tools[t]} onClick={() => setTools((s) => ({ ...s, [t]: !s[t] }))}>{t}</button>)}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="icon-btn round" title="Voice" aria-label="Voice"><Icon name="mic" size={15} /></button>
                {busy ? <button className="send stop" aria-label="Stop generating" disabled>■</button>
                  : <button className="send" aria-label="Send" disabled={!input.trim()} onClick={() => send()}><Icon name="send" size={15} /></button>}
              </div>
            </div>
          </div>
          <div className="foot-note">AGENT can make mistakes. Check important information.</div>
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
