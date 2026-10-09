"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

interface ChatCtx { activeId: string | null; setActiveId: (id: string | null) => void; filter: string; setFilter: (s: string) => void }
const Ctx = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  return <Ctx.Provider value={{ activeId, setActiveId, filter, setFilter }}>{children}</Ctx.Provider>;
}
export function useChat(): ChatCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChat outside ChatProvider");
  return c;
}
