import type { Approval, Mode } from "./store";

export interface NativeApi {
  platform: string;
  on(channel: string, cb: (payload: unknown) => void): () => void;
  setSize(w: number, h: number): void;
  decide(id: string, ok: boolean): void;
  focus(): void;
}
declare global { interface Window { agentNative?: NativeApi } }

/** Window size (px) needed to show the island in a given mode, including room for glow/confetti. */
export function windowSize(mode: Mode, pending: number): { w: number; h: number } {
  switch (mode) {
    case "idle": return { w: 240, h: 48 };
    case "compact": return { w: 450, h: pending > 0 ? 104 : 72 };
    case "alert": return { w: 650, h: 236 };
    case "expanded": return { w: 730, h: 530 };
    case "celebrate": return { w: 720, h: 280 };
  }
}
export const isExternal = (a: Approval | string): boolean => (typeof a === "string" ? a : a.id).startsWith("ext:");
