import type { SVGProps } from "react";

export type IconName =
  | "apps" | "bot" | "briefcase" | "check" | "chevron-down" | "chevron-left"
  | "chevron-right" | "clipboard" | "close" | "file" | "folder" | "grid"
  | "link" | "list" | "menu" | "message" | "more" | "paperclip" | "plus"
  | "search" | "send" | "settings" | "sliders" | "spark" | "tasks" | "upload" | "users"
  | "waveform" | "book" | "command" | "mic" | "edit" | "refresh" | "thumb-up" | "thumb-down";

const paths: Record<IconName, string> = {
  apps: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  bot: "M12 3v3M8 12h.01M16 12h.01M9 16h6M6 8h12a2 2 0 0 1 2 2v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a2 2 0 0 1 2-2Z",
  briefcase: "M4 7h16v13H4zM8 7V5h8v2M8 12h8",
  check: "m5 12 4 4L19 6",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-left": "m15 18-6-6 6-6",
  "chevron-right": "m9 18 6-6-6-6",
  clipboard: "M8 5h8M9 3h6v4H9zM6 5H4v16h16V5h-2M8 11h8M8 15h5",
  close: "M6 6l12 12M18 6 6 18",
  file: "M6 3h8l4 4v14H6zM14 3v5h5",
  folder: "M3 7h7l2 2h9v10H3z",
  grid: "M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z",
  link: "M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1",
  list: "M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01",
  menu: "M4 7h16M4 12h16M4 17h16",
  message: "M4 5h16v11H8l-4 4z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  paperclip: "m8 12 5.5-5.5a3 3 0 0 1 4 4L10 18a5 5 0 0 1-7-7l7-7",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-4.4-4.4M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
  send: "m4 4 16 8-16 8 3-8zM7 12h13",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4 12H2M22 12h-2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 4V2M12 22v-2",
  sliders: "M4 7h16M4 17h16M8 4v6M16 14v6",
  spark: "m12 3 1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5z",
  tasks: "M5 5h14M5 12h14M5 19h14",
  upload: "M12 16V4m0 0L7 9m5-5 5 5M5 20h14",
  users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 8a3 3 0 0 1 0 6M20 20v-1a4 4 0 0 0-3-3",
  waveform: "M3 12h3l2-7 4 14 2-7h7",
  book: "M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 0 2 2M9 8h6",
  command: "M9 9V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z",
  mic: "M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3ZM5 11a7 7 0 0 0 14 0M12 18v3M8 21h8",
  edit: "m4 16-.8 4.8L8 20l11-11-4-4zM13 6l4 4",
  refresh: "M20 11a8 8 0 0 0-14.7-3L4 10m0-5v5h5M4 13a8 8 0 0 0 14.7 3L20 14m0 5v-5h-5",
  "thumb-up": "M7 10v10H4V10zM7 20h9.5a2 2 0 0 0 1.9-1.4l2-6A2 2 0 0 0 18.5 10H14l.7-3.5A2 2 0 0 0 12.8 4L7 10",
  "thumb-down": "M7 14V4H4v10zM7 4h9.5a2 2 0 0 1 1.9 1.4l2 6A2 2 0 0 1 18.5 14H14l.7 3.5a2 2 0 0 1-1.9 2.5L7 14",
};

export function Icon({ name, size = 17, strokeWidth = 1.8, ...props }: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}><path d={paths[name]} /></svg>;
}
