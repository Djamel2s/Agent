import { contextBridge, ipcRenderer } from "electron";

const INBOUND = new Set(["bridge:agent", "bridge:approval", "bridge:cancel", "ui:toggle", "ui:demo", "ui:mute"]);

/** Minimal, whitelisted surface exposed to the renderer. No Node, no arbitrary IPC. */
contextBridge.exposeInMainWorld("agentNative", {
  platform: process.platform,
  on(channel: string, cb: (payload: unknown) => void): () => void {
    if (!INBOUND.has(channel)) return () => undefined;
    const h = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on(channel, h);
    return () => ipcRenderer.removeListener(channel, h);
  },
  setSize: (w: number, h: number) => ipcRenderer.send("companion:size", { w, h }),
  decide: (id: string, ok: boolean) => ipcRenderer.send("companion:decide", { id, ok }),
  focus: () => ipcRenderer.send("companion:focus"),
});
