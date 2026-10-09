import type { ReactNode } from "react";
import { Shell } from "../../components/Shell";
import { ChatProvider } from "../../components/chat-context";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ChatProvider>
      <Shell>{children}</Shell>
    </ChatProvider>
  );
}
