import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "AGENT Admin", description: "AGENT administration console" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
