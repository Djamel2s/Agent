import type { IconName } from "../components/Icon";

export const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/workspace", label: "Workspace", icon: "briefcase" },
  { href: "/agents", label: "Agents", icon: "bot" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/activity", label: "Activity", icon: "waveform" },
  { href: "/approvals", label: "Approvals", icon: "check" },
  { href: "/memory", label: "Memory", icon: "spark" },
  { href: "/knowledge", label: "Knowledge", icon: "book" },
  { href: "/integrations", label: "Integrations", icon: "command" },
];
