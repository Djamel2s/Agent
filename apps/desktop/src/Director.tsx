import { useEffect, useRef, useState, type Dispatch } from "react";
import { setMuted, blip } from "./sound";
import type { Action, State } from "./store";

export function useStory(s: State, d: Dispatch<Action>) {
  const timers = useRef<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const stateRef = useRef(s); stateRef.current = s;

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; setPlaying(false); };
  const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => clear, []);

  const approveFirst = (ok: boolean) => () => { const a = stateRef.current.approvals[0]; if (a) { blip(ok ? "ok" : "no"); d({ type: "DECIDE", id: a.id, ok }); } };
  const request = (kind: "action" | "security") => { blip("alert"); d({ type: "REQUEST", kind }); };

  const play = () => {
    clear(); setPlaying(true); d({ type: "RESET" });
    at(800, () => d({ type: "START_TASK" }));
    at(6500, () => request("action"));
    at(13500, approveFirst(true));
    at(17500, () => request("security"));
    at(24000, approveFirst(false));
    at(27500, () => { blip("ok"); d({ type: "COMPLETE" }); });
    at(36000, () => setPlaying(false));
  };
  return { playing, play, stop: clear, request };
}

export type Story = ReturnType<typeof useStory>;

export function Director({ s, d, story }: { s: State; d: Dispatch<Action>; story: Story }) {
  const [mute, setMute] = useState(false);
  const { playing, play, stop, request } = story;
  void s;

  return (
    <div className="director" role="toolbar" aria-label="Demo controls">
      <span className="tag">Prototype · simulated events</span>
      <button className={playing ? "on" : ""} onClick={playing ? stop : play}>{playing ? "■ Stop story" : "▶ Play story"}</button>
      <button onClick={() => d({ type: "START_TASK" })}>Start task</button>
      <button onClick={() => request("action")}>Approval</button>
      <button onClick={() => request("security")}>Security alert</button>
      <button onClick={() => { blip("ok"); d({ type: "COMPLETE" }); }}>Complete</button>
      <button onClick={() => { stop(); d({ type: "RESET" }); }}>Reset</button>
      <button onClick={() => { setMute(!mute); setMuted(!mute); }} aria-pressed={mute}>{mute ? "🔇" : "🔊"}</button>
    </div>
  );
}
