import type { Approval, Mode } from "./store";

export interface NativeApi {
  platform: string;
  on(channel: string, cb: (payload: unknown) => void): () => void;
  setSize(w: number, h: number): void;
  decide(id: string, ok: boolean): void;
  focus(): void;
  ask(text: string, agentId?: string): Promise<{ content?: string; error?: string }>;
  listAgents(): Promise<{ agents?: Array<{ id: string; name: string; role: string; hue: number }>; error?: string }>;
  session(): Promise<{ user?: { email: string; displayName: string; tenantId: string }; error?: string }>;
  login(email: string, password: string): Promise<{ user?: { email: string; displayName: string; tenantId: string }; error?: string }>;
  logout(): Promise<{ ok?: boolean }>;
}
declare global { interface Window { agentNative?: NativeApi } }

/** Window size (px) needed to show the island in a given mode, including room for glow/confetti. */
export function windowSize(mode: Mode, pending: number): { w: number; h: number } {
  switch (mode) {
    case "idle": return { w: 252, h: 56 };
    case "compact": return { w: 450, h: pending > 0 ? 104 : 72 };
    case "alert": return { w: 650, h: 236 };
    case "expanded": return { w: 730, h: 530 };
    case "celebrate": return { w: 720, h: 280 };
  }
}
export const isExternal = (a: Approval | string): boolean => (typeof a === "string" ? a : a.id).startsWith("ext:");
