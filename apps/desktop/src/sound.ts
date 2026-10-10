let ctx: AudioContext | null = null;
let muted = false;
export const setMuted = (m: boolean): void => { muted = m; };

type Kind = "alert" | "ok" | "no" | "open";
const NOTES: Record<Kind, number[]> = { alert: [660, 880], ok: [523, 659, 784], no: [330, 247], open: [440] };

/** Tiny synthesized blips (Web Audio) — no audio files. Requires a prior user gesture to be audible. */
export function blip(kind: Kind): void {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    const c = ctx;
    NOTES[kind].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      const t = c.currentTime + i * 0.09;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.3);
    });
  } catch { /* audio unavailable: stay silent */ }
}
