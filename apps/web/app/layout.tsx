import type { ReactNode } from "react";
import { SplashGate } from "../components/Splash";
import "./globals.css";

export const metadata = { title: "AGENT", description: "Give your AI agents a secure place to work." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><SplashGate>{children}</SplashGate></body>
    </html>
  );
}
