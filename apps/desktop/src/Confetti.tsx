import { motion } from "motion/react";

const COLORS = ["#0896ff", "#35d07f", "#f5b942", "#a78bfa", "#ff6fae", "#4cb8ff"];
const PARTS = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.2; const d = 70 + ((i * 37) % 70);
  return { x: Math.cos(a) * d * 1.5, y: Math.sin(a) * d * 0.9 + 30, r: (i * 53) % 360, c: COLORS[i % COLORS.length]!, w: 5 + (i % 3) * 2 };
});

export function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      <motion.span className="ring" initial={{ scale: 0.2, opacity: 0.8 }} animate={{ scale: 3.4, opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut" }} />
      {PARTS.map((p, i) => (
        <motion.span key={i} className="bit" style={{ background: p.c, width: p.w, height: p.w * 1.6 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }} animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.r * 2, scale: 0.6 }} transition={{ duration: 1.5 + (i % 4) * 0.12, ease: [0.2, 0.8, 0.3, 1] }} />
      ))}
    </div>
  );
}
