import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, safeStorage, screen, shell, Tray } from "electron";
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
let size = { w: 252, h: 56 };

function loadDevelopmentEnv(): void {
  if (!DEV_URL) return;
  const envFile = path.resolve(process.cwd(), "../../.env");
  try {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      const key = match?.[1];
      const value = match?.[2];
      if (key && value !== undefined && !process.env[key]) process.env[key] = value.replace(/^"(.*)"$/, "$1");
    }
  } catch { /* packaged builds use the process environment */ }
}

const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
const sessionFile = () => path.join(app.getPath("userData"), "session.json");
type DesktopSession = { token: string; user: { id: string; email: string; displayName: string; tenantId: string } };
type StoredSession = { token?: string; encryptedToken?: string; user: DesktopSession["user"] };
const loadSession = (): DesktopSession | undefined => {
  try {
    const stored = JSON.parse(fs.readFileSync(sessionFile(), "utf8")) as StoredSession;
    const token = stored.encryptedToken && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(stored.encryptedToken, "base64")) : stored.token;
    return token ? { token, user: stored.user } : undefined;
  } catch { return undefined; }
};
const saveSession = (session: DesktopSession | undefined): void => {
  fs.mkdirSync(path.dirname(sessionFile()), { recursive: true });
  if (session) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error("secure_storage_unavailable");
    const stored: StoredSession = { encryptedToken: safeStorage.encryptString(session.token).toString("base64"), user: session.user };
    fs.writeFileSync(sessionFile(), JSON.stringify(stored), { mode: 0o600 });
  }
  else try { fs.rmSync(sessionFile()); } catch { /* already logged out */ }
};
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
  loadDevelopmentEnv();
  loadSettings();
  if (process.platform === "darwin") app.dock?.hide();
  ipcMain.on("companion:size", (_e, p: { w?: unknown; h?: unknown }) => {
    if (typeof p.w === "number" && typeof p.h === "number") { size = { w: Math.min(Math.max(Math.round(p.w), 120), 1000), h: Math.min(Math.max(Math.round(p.h), 32), 800) }; place(); }
  });
  ipcMain.on("companion:focus", () => win?.focus());
  const api = () => process.env.API_URL?.trim() || "http://localhost:4000";
  ipcMain.handle("companion:session", async () => {
    const session = loadSession();
    if (!session) return { user: undefined };
    try {
      const response = await fetch(`${api()}/api/auth/me`, { headers: { cookie: `agent_session=${session.token}` }, redirect: "error" });
      if (!response.ok) { saveSession(undefined); return { error: "auth_required" }; }
      const user = await response.json() as DesktopSession["user"];
      saveSession({ token: session.token, user });
      return { user };
    } catch { return { error: "api_offline" }; }
  });
  ipcMain.handle("companion:login", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object") return { error: "invalid_input" };
    const input = payload as { email?: unknown; password?: unknown };
    if (typeof input.email !== "string" || typeof input.password !== "string" || !input.email.trim() || !input.password) return { error: "invalid_input" };
    try {
      const response = await fetch(`${api()}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: input.email, password: input.password }), redirect: "error" });
      const user = await response.json() as DesktopSession["user"] & { error?: string };
      if (!response.ok) return { error: user.error ?? "invalid_credentials" };
      const cookie = response.headers.get("set-cookie")?.match(/agent_session=([^;]+)/)?.[1];
      if (!cookie) return { error: "session_not_returned" };
      saveSession({ token: cookie, user });
      return { user };
    } catch { return { error: "api_offline" }; }
  });
  ipcMain.handle("companion:logout", async () => {
    const session = loadSession();
    if (session) { try { await fetch(`${api()}/api/auth/logout`, { method: "POST", headers: { cookie: `agent_session=${session.token}` } }); } catch { /* local logout still clears access */ } }
    saveSession(undefined);
    return { ok: true };
  });
  ipcMain.handle("companion:list-agents", async () => {
    const session = loadSession();
    if (!session) return { error: "auth_required" };
    try {
      const response = await fetch(`${api()}/api/agents`, { headers: { cookie: `agent_session=${session.token}` }, redirect: "error" });
      const payload = await response.json() as { agents?: Array<{ id: string; name: string; role: string; hue: number }>; error?: string };
      return response.ok ? { agents: payload.agents } : { error: payload.error ?? `request_failed_${response.status}` };
    } catch { return { error: "api_offline" }; }
  });
  ipcMain.handle("companion:ask", async (_event, payload: unknown) => {
    const request = typeof payload === "string" ? { text: payload, agentId: "researcher" } : payload as { text?: unknown; agentId?: unknown };
    const text = request.text;
    const agentId = typeof request.agentId === "string" && request.agentId.trim() ? request.agentId : "researcher";
    if (typeof text !== "string" || !text.trim() || text.length > 32_000) return { error: "invalid_input" };
    const session = loadSession();
    if (!session) return { error: "auth_required" };
    try {
      const response = await fetch(`${api()}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `agent_session=${session.token}` },
        body: JSON.stringify({ tenantId: session.user.tenantId, agentId, messages: [{ role: "user", content: text }] }),
        redirect: "error",
      });
      const payload = await response.json() as { content?: string; error?: string };
      return response.ok ? { content: payload.content } : { error: payload.error ?? `request_failed_${response.status}` };
    } catch { return { error: "api_offline" }; }
  });
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
