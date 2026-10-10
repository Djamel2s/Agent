"use client";
import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export interface ConversationSummary { id: string; title: string; agentId: string; updatedAt: string }
interface ChatCtx { activeId: string | null; setActiveId: (id: string | null) => void; filter: string; setFilter: (s: string) => void; conversations: ConversationSummary[]; setConversations: Dispatch<SetStateAction<ConversationSummary[]>> }
const Ctx = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  return <Ctx.Provider value={{ activeId, setActiveId, filter, setFilter, conversations, setConversations }}>{children}</Ctx.Provider>;
}
export function useChat(): ChatCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChat outside ChatProvider");
  return c;
}
