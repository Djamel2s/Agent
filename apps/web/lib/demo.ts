// DEMO DATA — everything in this file is fictional and only used by the design preview.
export type AgentState = "working" | "waiting" | "reviewing" | "idle" | "completed";
export interface DemoAgent { id: string; name: string; role: string; model: string; state: AgentState; hue: number; tools: string[]; skills: string[]; doing: string }
export interface AgentAppearance { label?: string; hue?: number; emoji?: string; }

const APPEARANCE_KEY = "agent.appearances";
export function readAgentAppearances(): Record<string, AgentAppearance> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "{}") as Record<string, AgentAppearance>; }
  catch { return {}; }
}
export function saveAgentAppearance(id: string, appearance: AgentAppearance) {
  const next = readAgentAppearances();
  next[id] = appearance;
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
}
export interface DemoStep { id: string; title: string; detail: string; agent: string }
export interface DemoTask { id: string; title: string; agent: string; status: "Running" | "Needs Approval" | "Completed" | "Queued" | "Failed"; priority: "Low" | "Normal" | "High"; budget: string; steps: DemoStep[]; progress: number }

export const AGENTS: DemoAgent[] = [
  { id: "researcher", name: "Researcher", role: "Finds & collects sources", model: "gpt-5 (demo)", state: "working", hue: 205, tools: ["web_search", "read_url", "github.read"], skills: ["Source vetting", "Citation style"], doing: "Searching sources" },
  { id: "developer", name: "Developer", role: "Writes & tests code", model: "claude (demo)", state: "waiting", hue: 150, tools: ["execute_code", "github.write", "create_file"], skills: ["TypeScript review", "Test writing"], doing: "Waiting for approval" },
  { id: "security", name: "Security Reviewer", role: "Reviews changes for risk", model: "gemini (demo)", state: "reviewing", hue: 25, tools: ["sast_scan", "github.read", "sentry.read"], skills: ["OWASP checklist", "Threat modeling"], doing: "Reviewing pull request #482" },
  { id: "analyst", name: "Data Analyst", role: "Queries & charts data", model: "mistral (demo)", state: "idle", hue: 280, tools: ["query_database", "create_chart"], skills: ["SQL hygiene", "Report layout"], doing: "Idle" },
  { id: "writer", name: "Report Writer", role: "Drafts final deliverables", model: "claude (demo)", state: "completed", hue: 330, tools: ["create_file", "send_email"], skills: ["Executive summary"], doing: "Delivered weekly report" },
];

export const TASKS: DemoTask[] = [
  { id: "t-101", title: "Weekly competitive report", agent: "Researcher", status: "Running", priority: "Normal", budget: "$0.80 / 120k tok", progress: 2, steps: [
    { id: "s1", title: "Search sources", detail: "web_search × 14 queries", agent: "Researcher" },
    { id: "s2", title: "Collect information", detail: "read_url × 23 pages", agent: "Researcher" },
    { id: "s3", title: "Analyze results", detail: "Cluster findings, rank by relevance", agent: "Data Analyst" },
    { id: "s4", title: "Generate report", detail: "Artifact: weekly-report.md", agent: "Report Writer" },
  ] },
  { id: "t-102", title: "Review PR #482 (auth refactor)", agent: "Security Reviewer", status: "Needs Approval", priority: "High", budget: "$0.35 / 60k tok", progress: 2, steps: [
    { id: "s1", title: "Read repository", detail: "github.read · 38 files", agent: "Security Reviewer" },
    { id: "s2", title: "Run static analysis", detail: "sast_scan · 2 findings", agent: "Security Reviewer" },
    { id: "s3", title: "Post review comment", detail: "github.write — requires approval", agent: "Developer" },
    { id: "s4", title: "Notify channel", detail: "Slack #security", agent: "Report Writer" },
  ] },
  { id: "t-103", title: "Monthly churn analysis", agent: "Data Analyst", status: "Completed", priority: "Normal", budget: "$0.22 / 40k tok", progress: 3, steps: [
    { id: "s1", title: "Query warehouse", detail: "query_database", agent: "Data Analyst" },
    { id: "s2", title: "Compute cohorts", detail: "execute_code (sandbox)", agent: "Data Analyst" },
    { id: "s3", title: "Publish chart", detail: "Artifact: churn.png", agent: "Data Analyst" },
  ] },
  { id: "t-104", title: "Onboarding emails for new hires", agent: "Report Writer", status: "Queued", priority: "Low", budget: "$0.10 / 20k tok", progress: -1, steps: [
    { id: "s1", title: "Draft emails", detail: "Template: onboarding-v2", agent: "Report Writer" },
    { id: "s2", title: "Send emails", detail: "send_email × 6 — requires approval", agent: "Report Writer" },
  ] },
];

export const ACTIVITY: { time: string; text: string; agent: string; kind: "task" | "tool" | "approval" | "security" | "integration" }[] = [
  { time: "10:42", text: "started Task “Weekly competitive report”", agent: "Researcher", kind: "task" },
  { time: "10:43", text: "GitHub connection verified", agent: "System", kind: "integration" },
  { time: "10:44", text: "analyzed repository acme/web (38 files)", agent: "Security Reviewer", kind: "tool" },
  { time: "10:45", text: "found 2 findings in auth middleware", agent: "Security Reviewer", kind: "security" },
  { time: "10:47", text: "requested approval: github.write comment", agent: "Developer", kind: "approval" },
  { time: "10:48", text: "completed Task “Monthly churn analysis”", agent: "Data Analyst", kind: "task" },
];
export const LIVE_EVENTS = [
  { text: "searching “agent governance frameworks”", agent: "Researcher", kind: "tool" as const },
  { text: "reading https://example.org/report (demo)", agent: "Researcher", kind: "tool" as const },
  { text: "blocked outbound request by DLP rule “no-secrets”", agent: "System", kind: "security" as const },
  { text: "clustered 23 findings into 5 themes", agent: "Data Analyst", kind: "tool" as const },
  { text: "drafted section 2 of weekly-report.md", agent: "Report Writer", kind: "task" as const },
];

export const MEMORIES = [
  { id: "m1", scope: "User", text: "Prefers concise reports with a one-line executive summary first.", source: "Chat · Sep 30", time: "2 days ago" },
  { id: "m2", scope: "Project", text: "Main competitors tracked: Acme, Globex, Initech.", source: "Task t-101", time: "Today" },
  { id: "m3", scope: "Agent · Security", text: "Repository acme/web uses a custom auth middleware in /lib/auth.", source: "Task t-102", time: "Today" },
  { id: "m4", scope: "Organization", text: "All outbound emails must be reviewed by a human.", source: "Policy", time: "Last month" },
];

export const INTEGRATIONS: { name: string; group: string; status: "Connected" | "Not configured" | "Coming soon" }[] = [
  { name: "GitHub", group: "Development", status: "Connected" }, { name: "Slack", group: "Communication", status: "Connected" },
  { name: "Microsoft Teams", group: "Communication", status: "Not configured" }, { name: "Outlook", group: "Microsoft", status: "Not configured" },
  { name: "Google Drive", group: "Google", status: "Not configured" }, { name: "Jira", group: "Development", status: "Not configured" },
  { name: "Notion", group: "Productivity", status: "Coming soon" }, { name: "Salesforce", group: "CRM", status: "Coming soon" },
  { name: "PostgreSQL", group: "Databases", status: "Not configured" }, { name: "Stripe", group: "Finance", status: "Coming soon" },
  { name: "MCP server (custom)", group: "MCP", status: "Not configured" }, { name: "OpenAPI import", group: "Connector builder", status: "Coming soon" },
];

export const APPROVALS = [
  { id: "a1", title: "Agent wants to post a review comment", action: "GITHUB_WRITE", by: "Developer", risk: "MEDIUM", target: "acme/web#482" },
  { id: "a2", title: "Agent wants to send 6 emails", action: "SEND_EMAIL", by: "Report Writer", risk: "HIGH", target: "6 external recipients" },
];

export const CONVERSATIONS = ["Weekly report planning", "PR #482 security review", "Churn cohort questions", "Draft: onboarding emails", "MCP server ideas"];
export const KNOWLEDGE = [
  { name: "Company handbook", docs: 42, acl: "All members", updated: "3 days ago" },
  { name: "Security policies", docs: 17, acl: "Security group", updated: "Last week" },
  { name: "Customer research", docs: 128, acl: "Product team", updated: "Today" },
];
export const MODELS = ["Auto (router)", "OpenAI", "Anthropic", "Gemini", "Mistral"];

// ---- Chat demo content (fictional) ----
export interface ChatMsg { role: "user" | "assistant"; text: string; tool?: string; artifact?: string }
export interface ChatConv { id: string; title: string; group: "Today" | "Yesterday" | "Previous 7 days"; messages: ChatMsg[] }
export const CHATS: ChatConv[] = [
  { id: "c1", title: "Weekly report planning", group: "Today", messages: [
    { role: "user", text: "Summarize this week’s competitor news and give me a table." },
    { role: "assistant", tool: "web_search · 14 queries · 23 pages read", artifact: "weekly-report.md", text: "I searched the web and cross-checked **three** sources per competitor. Highlights:\n\n| Competitor | News | Impact |\n|---|---|---|\n| Acme | New pricing tier | Medium |\n| Globex | Series B (fictional) | Low |\n| Initech | Quiet week | None |\n\nHere is the helper I used to rank findings:\n\n```python\ndef rank(findings):\n    return sorted(findings, key=lambda f: f.relevance, reverse=True)\n```\n\nI saved a full draft as an artifact. Want me to schedule this every Monday?" },
  ] },
  { id: "c2", title: "PR #482 security review", group: "Today", messages: [
    { role: "user", text: "Review PR #482 and flag anything risky in the auth middleware." },
    { role: "assistant", tool: "github.read · 38 files · sast_scan", text: "I found **2 findings**:\n\n- Session token compared with `==` instead of a constant-time check.\n- Missing rate limit on `/login`.\n\nPosting a review comment needs your approval (`github.write`)." },
  ] },
  { id: "c3", title: "Churn cohort questions", group: "Yesterday", messages: [{ role: "user", text: "Which cohort churned most in September?" }, { role: "assistant", text: "The **July signups** cohort churned most (demo data): 14% vs 8% average." }] },
  { id: "c4", title: "Draft: onboarding emails", group: "Yesterday", messages: [{ role: "user", text: "Draft onboarding emails for six new hires." }, { role: "assistant", text: "Drafted six emails from the `onboarding-v2` template. Sending requires approval." }] },
  { id: "c5", title: "MCP server ideas", group: "Previous 7 days", messages: [{ role: "user", text: "What MCP servers would help a security team?" }, { role: "assistant", text: "Good candidates: a SAST scanner, a ticketing connector, and a read-only log search." }] },
  { id: "c6", title: "Knowledge base cleanup", group: "Previous 7 days", messages: [{ role: "user", text: "Which handbook pages are outdated?" }, { role: "assistant", text: "Three pages were not updated in over a year (demo)." }] },
];
export const SUGGESTIONS = [
  { title: "Research a topic", sub: "Search, read and summarize sources" },
  { title: "Review a pull request", sub: "Static analysis with approval gates" },
  { title: "Analyze a dataset", sub: "Run code in an isolated sandbox" },
  { title: "Schedule a weekly report", sub: "Create an automation" },
];
