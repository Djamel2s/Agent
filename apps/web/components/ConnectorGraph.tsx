"use client";
import { AGENTS } from "../lib/demo";

const TOOLS = ["GitHub", "Slack", "MCP: docs", "Sandbox"];
const LINKS: [string, string][] = [["researcher", "MCP: docs"], ["developer", "GitHub"], ["security", "GitHub"], ["analyst", "Sandbox"], ["writer", "Slack"]];

export function ConnectorGraph() {
  const ay = (i: number) => 24 + i * 36;
  const ty = (i: number) => 34 + i * 46;
  return (
    <svg className="graph" viewBox="0 0 400 190" role="img" aria-label="Agent to tool connections (demo)">
      {LINKS.map(([a, t]) => {
        const ai = AGENTS.findIndex((x) => x.id === a); const ti = TOOLS.indexOf(t);
        const hot = AGENTS[ai]?.state === "working";
        return <line key={a + t} className={`edge ${hot ? "hot" : ""}`} x1={110} y1={ay(ai)} x2={290} y2={ty(ti)} />;
      })}
      {AGENTS.map((a, i) => (<g key={a.id}><circle cx={100} cy={ay(i)} r={7} fill={`hsl(${a.hue} 75% 55%)`} /><text x={88} y={ay(i) + 4} textAnchor="end">{a.name}</text></g>))}
      {TOOLS.map((t, i) => (<g key={t}><rect x={290} y={ty(i) - 10} width={96} height={20} rx={6} fill="#121925" stroke="#243145" /><text x={338} y={ty(i) + 4} textAnchor="middle">{t}</text></g>))}
    </svg>
  );
}
