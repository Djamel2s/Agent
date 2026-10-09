import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, screen, shell, Tray } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createBridge } from "./bridge";

app.setName("AGENT Companion");
if (process.platform === "linux") { app.commandLine.appendSwitch("enable-transparent-visuals"); app.disableHardwareAcceleration(); }
if (!app.requestSingleInstanceLock()) app.quit();

const DEV_URL = process.env.AGENT_DEV_URL;
const BRIDGE_PORT = 47821;
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let visible = true;
let muted = false;
let size = { w: 240, h: 48 };

const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
const loadSettings = (): void => { try { muted = Boolean((JSON.parse(fs.readFileSync(settingsFile(), "utf8")) as { muted?: boolean }).muted); } catch { /* first run */ } };
const saveSettings = (): void => { try { fs.writeFileSync(settingsFile(), JSON.stringify({ muted })); } catch { /* non-fatal */ } };
const send = (channel: string, payload?: unknown): void => { win?.webContents.send(channel, payload); };

function place(): void {
  if (!win) return;
  const b = screen.getPrimaryDisplay().bounds;
  win.setBounds({ x: Math.round(b.x + (b.width - size.w) / 2), y: b.y, width: size.w, height: size.h });
}

function createWindow(): void {
  win = new BrowserWindow({
    width: size.w, height: size.h, frame: false, transparent: true, backgroundColor: "#00000000", hasShadow: false,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true, show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) void shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.once("ready-to-show", () => { place(); win?.showInactive(); send("ui:mute", muted); });
  if (DEV_URL) void win.loadURL(DEV_URL); else void win.loadFile(path.join(__dirname, "../dist/index.html"));
}

function setVisible(v: boolean): void { visible = v; if (v) win?.showInactive(); else win?.hide(); refreshTray(); }

function refreshTray(): void {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: visible ? "Hide companion" : "Show companion", click: () => setVisible(!visible) },
    { label: "Expand / collapse  (Ctrl/Cmd+Shift+Space)", click: () => { setVisible(true); send("ui:toggle"); win?.focus(); } },
    { label: "Run demo story", click: () => { setVisible(true); send("ui:demo"); } },
    { type: "separator" },
    { label: "Mute sounds", type: "checkbox", checked: muted, click: (i) => { muted = i.checked; saveSettings(); send("ui:mute", muted); } },
    { label: "Launch at login", type: "checkbox", checked: app.getLoginItemSettings().openAtLogin, click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]));
}

async function startBridge(): Promise<void> {
  const file = path.join(app.getPath("userData"), "bridge.json");
  let token: string | undefined;
  try { token = (JSON.parse(fs.readFileSync(file, "utf8")) as { token?: string }).token; } catch { /* first run */ }
  token ??= crypto.randomBytes(24).toString("hex");

  const bridge = createBridge({
    token,
    onAgent: (a) => send("bridge:agent", a),
    onApproval: (item) => { setVisible(true); send("bridge:approval", item); },
    onCancel: (id) => send("bridge:cancel", id),
  });
  ipcMain.on("companion:decide", (_e, p: { id?: unknown; ok?: unknown }) => { if (typeof p.id === "string" && typeof p.ok === "boolean") bridge.decide(p.id, p.ok); });
  const port = await bridge.listen(BRIDGE_PORT).catch(() => bridge.listen(0));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ port, token }), { mode: 0o600 });
  app.on("before-quit", () => bridge.close());
}

app.whenReady().then(async () => {
  loadSettings();
  if (process.platform === "darwin") app.dock?.hide();
  ipcMain.on("companion:size", (_e, p: { w?: unknown; h?: unknown }) => {
    if (typeof p.w === "number" && typeof p.h === "number") { size = { w: Math.min(Math.max(Math.round(p.w), 120), 1000), h: Math.min(Math.max(Math.round(p.h), 32), 800) }; place(); }
  });
  ipcMain.on("companion:focus", () => win?.focus());
  createWindow();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "../build/tray.png")));
  tray.setToolTip("AGENT Companion");
  refreshTray();
  globalShortcut.register("CommandOrControl+Shift+Space", () => { setVisible(true); send("ui:toggle"); win?.focus(); });
  screen.on("display-metrics-changed", place);
  await startBridge();
});

app.on("second-instance", () => setVisible(true));
app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => { /* keep running in the tray */ });
