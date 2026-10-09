import { useEffect, useId, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import type { AgentState } from "./store";

interface Props { hue: number; state: AgentState; size?: number }

/** An agent "creature": eyes follow the pointer, blink, and the face/aura change with state. */
export function Orb({ hue, state, size = 40 }: Props) {
  const gid = useId();
  const ref = useRef<HTMLDivElement>(null);
  const lx = useMotionValue(0); const ly = useMotionValue(0);
  const sx = useSpring(lx, { stiffness: 220, damping: 18 }); const sy = useSpring(ly, { stiffness: 220, damping: 18 });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect(); if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1; const k = Math.min(1, d / 120) * 2.6;
      lx.set((dx / d) * k); ly.set((dy / d) * k);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [lx, ly]);

  const happy = state === "completed"; const sleepy = state === "idle";
  const aura = state === "idle" ? 0 : 1;
  const bodyAnim =
    state === "working" ? { y: [0, -2.5, 0], transition: { duration: 0.9, repeat: Infinity } }
    : state === "waiting" ? { rotate: [-5, 5, -5], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const } }
    : state === "completed" ? { y: [0, -3.5, 0], transition: { duration: 0.6, repeat: 3 } }
    : state === "reviewing" ? { scale: [1, 1.05, 1], transition: { duration: 1.8, repeat: Infinity } }
    : { y: [0, 1, 0], transition: { duration: 3.4, repeat: Infinity } };
  const c1 = `hsl(${hue} 85% 66%)`; const c2 = `hsl(${hue} 80% 42%)`;

  return (
    <div ref={ref} className="orb" style={{ width: size, height: size }}>
      {aura === 1 && <motion.span className="aura" style={{ background: `hsl(${hue} 90% 60% / .45)` }} animate={{ scale: [0.9, 1.5], opacity: [0.7, 0] }} transition={{ duration: state === "waiting" ? 2.2 : 1.3, repeat: Infinity, ease: "easeOut" }} />}
      <motion.svg viewBox="0 0 40 40" width={size} height={size} animate={bodyAnim} style={{ overflow: "visible" }}>
        <defs><radialGradient id={gid} cx="35%" cy="30%" r="80%"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></radialGradient></defs>
        <circle cx="20" cy="20" r="17" fill={`url(#${gid})`} />
        <ellipse cx="14" cy="11" rx="6" ry="3" fill="#fff" opacity=".22" />
        {happy ? (<><path d="M10 19 q4 -5 8 0" stroke="#10131a" strokeWidth="2.2" fill="none" strokeLinecap="round" /><path d="M22 19 q4 -5 8 0" stroke="#10131a" strokeWidth="2.2" fill="none" strokeLinecap="round" /></>)
        : sleepy ? (<><path d="M10 20 h8" stroke="#10131a" strokeWidth="2.2" strokeLinecap="round" /><path d="M22 20 h8" stroke="#10131a" strokeWidth="2.2" strokeLinecap="round" /></>)
        : (<motion.g animate={{ scaleY: [1, 1, 0.08, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.94, 0.97, 1] }} style={{ transformOrigin: "20px 19px" }}>
            <ellipse cx="14" cy="19" rx="4.4" ry={state === "waiting" ? 5.6 : 5} fill="#fff" /><ellipse cx="26" cy="19" rx="4.4" ry={state === "waiting" ? 5.6 : 5} fill="#fff" />
            <motion.g style={{ x: sx, y: sy }}><circle cx="14" cy="19" r="2.3" fill="#10131a" /><circle cx="26" cy="19" r="2.3" fill="#10131a" /></motion.g>
          </motion.g>)}
        {state === "working" && <motion.ellipse cx="20" cy="28.5" rx="2.6" ry="1.8" fill="#10131a" animate={{ scaleY: [0.7, 1.3, 0.7] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ transformOrigin: "20px 28.5px" }} />}
        {state === "reviewing" && <motion.path d="M16 28 h8" stroke="#10131a" strokeWidth="2" strokeLinecap="round" animate={{ scaleX: [1, 1.35, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: "20px 28px" }} />}
        {state === "waiting" && <circle cx="20" cy="29" r="1.6" fill="#10131a" />}
        {happy && <path d="M14.5 27 q5.5 5.5 11 0" stroke="#10131a" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
        {sleepy && <motion.text x="29" y="9" fontSize="8" fill="#9aa4b5" animate={{ opacity: [0, 1, 0], y: [10, 5, 1] }} transition={{ duration: 3, repeat: Infinity }}>z</motion.text>}
      </motion.svg>
      {state === "reviewing" && <motion.span className="lens" animate={{ rotate: 360 }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}><i /></motion.span>}
      {state === "waiting" && <motion.span className="qmark" animate={{ y: [0, -3, 0], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.2, repeat: Infinity }}>?</motion.span>}
    </div>
  );
}
