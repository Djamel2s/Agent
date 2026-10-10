"use client";
import { useState, type ReactNode } from "react";

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((p, i) =>
    p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong>
    : p.startsWith("`") ? <code key={i} className="ic">{p.slice(1, -1)}</code> : <span key={i}>{p}</span>);
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="codeblock">
      <div className="cb-head"><span>{lang || "text"}</span>
        <button onClick={() => { void navigator.clipboard?.writeText(code); setOk(true); setTimeout(() => setOk(false), 1400); }}>{ok ? "✓ Copied" : "Copy code"}</button></div>
      <pre>{code}</pre>
    </div>
  );
}

/** Minimal, safe markdown: paragraphs, bullets, tables, fenced code, bold, inline code. No raw HTML. */
export function Markdown({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    if (l.startsWith("```")) {
      const lang = l.slice(3).trim(); const buf: string[] = []; i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) buf.push(lines[i++]!);
      i++; out.push(<CodeBlock key={out.length} lang={lang} code={buf.join("\n")} />); continue;
    }
    if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) { rows.push(lines[i]!.split("|").slice(1, -1).map((c) => c.trim())); i++; }
      const [head, , ...body] = rows;
      out.push(<div key={out.length} className="tbl-wrap"><table className="md-table"><thead><tr>{head?.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
        <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody></table></div>); continue;
    }
    if (l.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("- ")) items.push(lines[i++]!.slice(2));
      out.push(<ul key={out.length}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>); continue;
    }
    if (l.trim()) out.push(<p key={out.length}>{inline(l)}</p>);
    i++;
  }
  return <div className="md">{out}</div>;
}
