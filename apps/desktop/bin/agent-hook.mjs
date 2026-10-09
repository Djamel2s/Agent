#!/usr/bin/env node
// Ask the AGENT Companion for a human decision, from any script or agent hook.
//   agent-hook approve --title "Post comment" --action GITHUB_WRITE --by Developer --target acme/web#482 [--risk HIGH] [--timeout 60] [--fail-open]
//   agent-hook presence --id dev --name Developer --state working --doing "Running tests"
// Exit codes: 0 approved | 1 rejected | 3 timed out | 4 companion offline (0 with --fail-open) | 2 usage/error
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i++) if (rest[i].startsWith("--")) { const k = rest[i].slice(2); flags[k] = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : true; }

const home = os.homedir();
const dir = process.platform === "darwin" ? path.join(home, "Library", "Application Support", "AGENT Companion")
  : process.platform === "win32" ? path.join(process.env.APPDATA ?? path.join(home, "AppData", "Roaming"), "AGENT Companion")
  : path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, ".config"), "AGENT Companion");

let cfg;
try { cfg = JSON.parse(fs.readFileSync(path.join(dir, "bridge.json"), "utf8")); } catch { cfg = null; }
const offline = () => { console.error("companion-offline"); process.exit(flags["fail-open"] ? 0 : 4); };
if (!cfg) offline();

const headers = { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" };
const base = `http://127.0.0.1:${cfg.port}`;

try {
  if (cmd === "approve") {
    const timeoutMs = Number(flags.timeout ?? 60) * 1000;
    const res = await fetch(`${base}/v1/approvals`, { method: "POST", headers, signal: AbortSignal.timeout(timeoutMs + 5000),
      body: JSON.stringify({ title: flags.title, action: flags.action, by: flags.by, target: flags.target, risk: flags.risk, agentId: flags.agent, timeoutMs }) });
    if (!res.ok) { console.error(`error ${res.status}`); process.exit(2); }
    const { decision } = await res.json();
    console.log(decision);
    process.exit(decision === "approve" ? 0 : decision === "reject" ? 1 : 3);
  } else if (cmd === "presence") {
    const res = await fetch(`${base}/v1/agents`, { method: "POST", headers, signal: AbortSignal.timeout(2000),
      body: JSON.stringify({ id: flags.id, name: flags.name, state: flags.state, doing: flags.doing }) });
    process.exit(res.ok ? 0 : 2);
  } else { console.error("usage: agent-hook approve|presence [flags]"); process.exit(2); }
} catch { offline(); }
