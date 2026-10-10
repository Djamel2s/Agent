"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy || !email || password.length < 12) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, displayName: email.split("@")[0] }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setError(body.error === "invalid_request" ? "Use a valid email and a password of at least 12 characters." : body.error === "email_already_registered" ? "This email already has an account. Sign in instead." : body.error ?? "Authentication failed");
        return;
      }
      if (register) { setRegister(false); setPassword(""); setError("Account created. Sign in to continue."); return; }
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/chat");
    } finally { setBusy(false); }
  };
  const valid = Boolean(email && password.length >= 12);
  return <main className="auth-page auth-simple">
    <section className="auth-simple-card">
      <div className="auth-simple-brand"><img src="/logo.png" alt="" /><span>AGENT</span></div>
      <div className="auth-simple-form">
          <h1>{register ? "Create your account" : "Welcome back"}</h1>
          <p>{register ? "Start building your private agent workspace." : "Sign in to continue to your workspace."}</p>
          <label className="field">Email address<input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="field">Password<input type="password" autoComplete={register ? "new-password" : "current-password"} placeholder="At least 12 characters" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <div className={`password-hint ${password.length >= 12 ? "ready" : ""}`}><span>{password.length >= 12 ? "✓" : "○"}</span> Minimum 12 characters</div>
          {error && <p role="alert" className={error.startsWith("Account created") ? "auth-success" : "auth-error"}>{error}</p>}
          <button className="btn primary auth-submit" disabled={!valid || busy} onClick={() => void submit()}>{busy ? "Securing workspace…" : register ? "Create secure account" : "Continue to workspace"}<span>→</span></button>
          <button className="auth-switch" onClick={() => { setRegister(!register); setError(""); }}>{register ? "Already have an account?" : "New to AGENT? Create an account"} <b>{register ? "Sign in" : "Get started"}</b></button>
      </div>
      <div className="auth-simple-foot">Private workspace · Policy enforced</div>
    </section>
  </main>;
}
