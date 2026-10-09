"use client";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

export function SplashGate({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (sessionStorage.getItem("agent-splash")) { setShow(false); return; }
    sessionStorage.setItem("agent-splash", "1");
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div className="splash" exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.6 }}>
            <div className="splash-glow" />
            <motion.img src="/logo.png" alt="AGENT" width={112} height={112}
              initial={{ scale: 0.6, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 90, damping: 14 }} />
            <motion.div className="splash-word" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>AGENT</motion.div>
            <motion.div className="splash-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>Give your AI agents a secure place to work.</motion.div>
            <motion.div className="splash-bar" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.4, duration: 1.6, ease: "easeInOut" }} />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
