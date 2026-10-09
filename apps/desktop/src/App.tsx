import { useEffect, useReducer, useRef, type Dispatch } from "react";
import { Island } from "./Island";
import { Menubar, Scene } from "./Desktop";
import { Director, useStory } from "./Director";
import { blip, setMuted } from "./sound";
import { isExternal, windowSize } from "./native";
import { initialState, modeOf, reducer, type Action, type Approval, type State } from "./store";

type BridgeAgent = Extract<Action, { type: "UPSERT_AGENT" }>["agent"];

export function App() {
  const [s, d] = useReducer(reducer, undefined, initialState);
  const native = window.agentNative;
  const mode = modeOf(s);
  const sRef = useRef<State>(s); sRef.current = s;

  // Decisions on bridge approvals must reach the requesting agent through the main process.
  const dd: Dispatch<Action> = (a) => {
    if (a.type === "DECIDE" && isExternal(a.id)) native?.decide(a.id, a.ok);
    if (a.type === "EXPAND" && a.value) native?.focus();
    d(a);
  };
  const story = useStory(s, dd);
  const storyRef = useRef(story); storyRef.current = story;

  useEffect(() => {
    if (s.celebrate <= 0) return;
    const t = setTimeout(() => d({ type: "CLEAR_CELEBRATE" }), 2800);
    return () => clearTimeout(t);
  }, [s.celebrate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (mode === "expanded") d({ type: "EXPAND", value: false }); else if (mode === "alert") d({ type: "DISMISS" }); }
      if (e.key === "Enter" && mode === "alert" && !(e.target instanceof HTMLInputElement)) {
        const a = s.approvals[0]; if (a) { blip("ok"); dd({ type: "DECIDE", id: a.id, ok: true }); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, s.approvals]);

  // Native app: events coming from the main process (bridge, tray, global shortcut).
  useEffect(() => {
    if (!native) return;
    const offs = [
      native.on("bridge:agent", (p) => d({ type: "UPSERT_AGENT", agent: p as BridgeAgent })),
      native.on("bridge:approval", (p) => { blip("alert"); d({ type: "REQUEST_EXT", item: p as Approval }); }),
      native.on("bridge:cancel", (p) => d({ type: "CANCEL_EXT", id: String(p) })),
      native.on("ui:toggle", () => { const v = !sRef.current.expanded; if (v) native.focus(); d({ type: "EXPAND", value: v }); }),
      native.on("ui:demo", () => storyRef.current.play()),
      native.on("ui:mute", (p) => setMuted(Boolean(p))),
    ];
    return () => offs.forEach((off) => off());
  }, [native]);

  // Native app: keep the OS window exactly as big as the island so the rest of the screen stays clickable.
  const pending = s.approvals.length;
  const prev = useRef(windowSize("idle", 0));
  useEffect(() => {
    if (!native) return;
    const next = windowSize(mode, pending); const old = prev.current;
    const grows = next.w >= old.w && next.h >= old.h;
    const t = setTimeout(() => { native.setSize(next.w, next.h); prev.current = next; }, grows ? 0 : 480);
    return () => clearTimeout(t);
  }, [mode, pending, native]);

  return (
    <div className="desk">
      {!native && <><Scene log={s.log} /><Menubar /></>}
      <div className="notch-slot"><Island s={s} d={dd} /></div>
      {mode === "compact" && pending > 0 && <button className="pending-pill" onClick={() => dd({ type: "EXPAND", value: true })}>{pending} pending approval{pending > 1 ? "s" : ""}</button>}
      {!native && <Director s={s} d={dd} story={story} />}
    </div>
  );
}
