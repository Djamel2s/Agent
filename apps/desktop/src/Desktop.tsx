import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { LogLine } from "./store";

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 15000); return () => clearInterval(i); }, []);
  return <span>{t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>;
}

export function Menubar() {
  return (
    <div className="menubar">
      <div className="mb-l"><b>Desktop</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><span>Help</span></div>
      <div className="mb-r"><span>◉</span><span>⌁ 87%</span><span>Wi-Fi</span><Clock /></div>
    </div>
  );
}

function Win({ title, className, children, delay = 0 }: { title: string; className: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div className={`win ${className}`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.7 }}>
      <div className="win-bar"><i className="tl r" /><i className="tl y" /><i className="tl g" /><span>{title}</span></div>
      <div className="win-body">{children}</div>
    </motion.div>
  );
}

export function Scene({ log }: { log: LogLine[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [log]);
  return (
    <div className="scene">
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      <Win title="agents — zsh" className="w-term" delay={0.2}>
        <div className="term">
          <div className="dim">$ agent watch --org demo</div>
          <div className="dim">listening for agent events (simulated)…</div>
          {log.map((l) => <div key={l.id} className={`tl-${l.tone}`}>[{l.t}] {l.text}</div>)}
          <div className="caret">▍</div><div ref={end} />
        </div>
      </Win>
      <Win title="acme/web — Pull request #482" className="w-pr" delay={0.4}>
        <div className="pr"><b>refactor: auth middleware</b><div className="dim">+212 −148 · 38 files</div>
          <div className="diff add">+ const ok = timingSafeEqual(token, expected)</div>
          <div className="diff del">- if (token == expected) return next()</div>
          <div className="diff add">+ rateLimit(&quot;/login&quot;, 5, &quot;1m&quot;)</div></div>
      </Win>
    </div>
  );
}
