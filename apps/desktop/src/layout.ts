import type { Mode } from "./store";

export const SIZE: Record<Mode, { w: number; h: number; r: number }> = {
  idle: { w: 392, h: 42, r: 21 }, compact: { w: 392, h: 42, r: 21 }, celebrate: { w: 392, h: 42, r: 21 },
  alert: { w: 580, h: 176, r: 30 }, expanded: { w: 660, h: 470, r: 34 },
};

// In the installed app the window is a transparent rectangle: shadows must fade to zero before its edge,
// otherwise they get cut off and show up as a grey box. These stay well inside the margins in native.ts.
export const GLOW_NATIVE: Record<Mode, string> = {
  idle: "0 0 14px -4px rgba(8,150,255,.45), 0 3px 8px -3px rgba(0,0,0,.4)",
  compact: "0 0 14px -4px rgba(8,150,255,.5), 0 3px 8px -3px rgba(0,0,0,.4)",
  celebrate: "0 0 18px -4px rgba(53,208,127,.7), 0 3px 8px -3px rgba(0,0,0,.4)",
  alert: "0 0 22px -8px rgba(245,185,66,.65), 0 8px 16px -8px rgba(0,0,0,.5)",
  expanded: "0 0 22px -10px rgba(8,150,255,.5), 0 10px 18px -10px rgba(0,0,0,.5)",
};
