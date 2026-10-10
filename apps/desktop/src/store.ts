export type AgentState = "working" | "waiting" | "reviewing" | "idle" | "completed";
export type Risk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export interface Agent { id: string; name: string; role: string; hue: number; state: AgentState; doing: string }
export interface Approval { id: string; kind: "action" | "security"; title: string; action: string; by: string; risk: Risk; target: string; yes: string; no: string; agentId?: string }
export interface LogLine { id: number; t: string; text: string; tone: "info" | "ok" | "warn" | "bad" }

export interface State {
  agents: Agent[]; approvals: Approval[]; log: LogLine[];
  expanded: boolean; dismissed: boolean; celebrate: number; step: number; seq: number;
}

export const INITIAL_AGENTS: Agent[] = [
  { id: "researcher", name: "Researcher", role: "Finds sources", hue: 205, state: "idle", doing: "Idle" },
  { id: "developer", name: "Developer", role: "Writes code", hue: 150, state: "idle", doing: "Idle" },
  { id: "security", name: "Security", role: "Reviews risk", hue: 28, state: "idle", doing: "Idle" },
  { id: "analyst", name: "Analyst", role: "Queries data", hue: 280, state: "idle", doing: "Idle" },
  { id: "writer", name: "Writer", role: "Drafts reports", hue: 330, state: "idle", doing: "Idle" },
];
export const TASK_STEPS = ["Search sources", "Collect information", "Analyze results", "Generate report"];

export const initialState = (): State => ({ agents: INITIAL_AGENTS, approvals: [], log: [], expanded: false, dismissed: false, celebrate: 0, step: -1, seq: 0 });

export type Action =
  | { type: "RESET" } | { type: "START_TASK" } | { type: "REQUEST"; kind: Approval["kind"] }
  | { type: "DECIDE"; id: string; ok: boolean } | { type: "COMPLETE" } | { type: "CLEAR_CELEBRATE" }
  | { type: "EXPAND"; value: boolean } | { type: "DISMISS" } | { type: "ASK"; text: string }
  | { type: "UPSERT_AGENT"; agent: { id: string; name: string; state: AgentState; doing?: string } }
  | { type: "REQUEST_EXT"; item: Approval } | { type: "CANCEL_EXT"; id: string };

const hueOf = (id: string): number => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

const set = (agents: Agent[], id: string, state: AgentState, doing: string): Agent[] => agents.map((a) => (a.id === id ? { ...a, state, doing } : a));
const stamp = (): string => new Date().toLocaleTimeString("en-GB", { hour12: false });
const line = (s: State, text: string, tone: LogLine["tone"] = "info"): State => ({ ...s, seq: s.seq + 1, log: [...s.log, { id: s.seq + 1, t: stamp(), text, tone }].slice(-40) });

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "RESET": return initialState();
    case "START_TASK": {
      let agents = set(s.agents, "researcher", "working", "Searching sources");
      agents = set(agents, "security", "reviewing", "Reviewing PR #482");
      agents = set(agents, "analyst", "working", "Clustering findings");
      return line(line({ ...s, agents, step: 1 }, "Researcher started “Weekly competitive report”"), "Security reviewing PR #482 (38 files)");
    }
    case "REQUEST": {
      const sec = a.kind === "security";
      const item: Approval = sec
        ? { id: `a${s.seq}`, kind: "security", title: "DLP blocked a secret in an outbound email", action: "SEND_EMAIL", by: "Writer", risk: "CRITICAL", target: "external@partner.example", yes: "Allow once", no: "Block" }
        : { id: `a${s.seq}`, kind: "action", title: "Developer wants to post a review comment", action: "GITHUB_WRITE", by: "Developer", risk: "MEDIUM", target: "acme/web#482", yes: "Approve", no: "Reject" };
      const agents = set(s.agents, sec ? "writer" : "developer", "waiting", "Waiting for approval");
      return line({ ...s, agents, approvals: [...s.approvals, item], dismissed: false }, `${item.by} needs approval: ${item.action}`, "warn");
    }
    case "DECIDE": {
      const item = s.approvals.find((x) => x.id === a.id);
      if (!item) return s;
      const id = item.agentId ?? (item.kind === "security" ? "writer" : "developer");
      const agents = set(s.agents, id, a.ok ? "working" : "idle", a.ok ? "Resuming" : "Stopped");
      return line({ ...s, agents, approvals: s.approvals.filter((x) => x.id !== a.id), dismissed: false, step: a.ok ? Math.min(s.step + 1, 3) : s.step }, `${item.action} ${a.ok ? "approved" : "rejected"}`, a.ok ? "ok" : "bad");
    }
    case "COMPLETE": {
      const agents = s.agents.map((x) => (x.id === "writer" ? { ...x, state: "completed" as const, doing: "Delivered weekly report" } : { ...x, state: "idle" as const, doing: "Idle" }));
      return line({ ...s, agents, approvals: [], step: 4, celebrate: s.celebrate + 1, dismissed: false }, "Task completed — artifact weekly-report.md ready", "ok");
    }
    case "UPSERT_AGENT": {
      const { id, name, state, doing } = a.agent;
      const text = doing ?? (state === "idle" ? "Idle" : state);
      const exists = s.agents.some((x) => x.id === id);
      const agents = exists ? set(s.agents, id, state, text) : [...s.agents, { id, name, role: "External agent", hue: hueOf(id), state, doing: text }];
      return { ...s, agents: agents.slice(-8) };
    }
    case "REQUEST_EXT": {
      const agents = a.item.agentId ? set(s.agents, a.item.agentId, "waiting", "Waiting for approval") : s.agents;
      return line({ ...s, agents, approvals: [...s.approvals, a.item], dismissed: false }, `${a.item.by} needs approval: ${a.item.action}`, "warn");
    }
    case "CANCEL_EXT": return s.approvals.some((x) => x.id === a.id) ? line({ ...s, approvals: s.approvals.filter((x) => x.id !== a.id) }, "Approval request expired", "info") : s;
    case "CLEAR_CELEBRATE": return { ...s, celebrate: -Math.abs(s.celebrate) };
    case "EXPAND": return { ...s, expanded: a.value };
    case "DISMISS": return { ...s, dismissed: true };
    case "ASK": return line({ ...s, agents: set(s.agents, "researcher", "working", `Working on: ${a.text.slice(0, 24)}`) }, `You → Researcher: ${a.text}`);
  }
}

export type Mode = "idle" | "compact" | "alert" | "expanded" | "celebrate";
export function modeOf(s: State): Mode {
  if (s.expanded) return "expanded";
  if (s.celebrate > 0) return "celebrate";
  if (s.approvals.length > 0 && !s.dismissed) return "alert";
  if (s.agents.some((x) => x.state !== "idle") || s.approvals.length > 0) return "compact";
  return "idle";
}
