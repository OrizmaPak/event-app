"use client";

import Link from "next/link";
import { ArrowRight, Check, KeyRound, LockKeyhole, Mail, QrCode, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/shared/Brand";

export function ScannerLogin() {
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("john@nasaevent.demo");
  const [password, setPassword] = useState("demo1234");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); const response = await fetch("/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, mfaCode: mfaCode || undefined }) }); const body = await response.json() as { error?: { code?: string; message?: string } }; if (!response.ok) { if (body.error?.code === "MFA_REQUIRED") setMfaRequired(true); setError(body.error?.message ?? "Access could not be verified."); setBusy(false); return; } const session = await fetch("/api/v1/auth/session").then((item) => item.json()) as { data?: { permissions?: string[] } }; const permissions = session.data?.permissions ?? []; if (!permissions.includes("*") && !permissions.includes("checkin.operate")) { setError("This account is not assigned to check-in."); setBusy(false); return; } window.location.href = search.get("returnTo") || "/check-in/events"; }
  return <main className="scanner-login-page"><header><Brand inverse /><Link href="/organizer/login">Organizer dashboard</Link></header><div className="scanner-login-layout"><section className="scanner-login-copy"><span className="scanner-kicker"><i /> EVENT-DAY CHECK-IN</span><h1>Welcome every guest with confidence.</h1><p>This application is intentionally separate from the organizer dashboard. Staff see only the events and guest information assigned to their account.</p><div className="scanner-login-features"><span><Check size={15} /> Fast QR verification</span><span><Check size={15} /> Seat and table details</span><span><Check size={15} /> Idempotent partial group check-in</span></div></section><form className="scanner-login-card" onSubmit={submit}><span className="scanner-login-icon"><QrCode size={26} /></span><small>STAFF ACCESS</small><h2>Sign in to check-in</h2><p>Use the team account invited by the event organizer.</p>{error && <div className="form-error" role="alert">{error}</div>}<label><span>Email address</span><div><Mail size={18} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><label><span>Password</span><div><LockKeyhole size={18} /><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>{mfaRequired && <label><span>Authentication or recovery code</span><div><KeyRound size={18} /><input required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} /></div></label>}<button type="submit" disabled={busy}>{busy ? "Checking access…" : <>Continue to event <ArrowRight size={18} /></>}</button><div className="scanner-security"><ShieldCheck size={17} /><span><b>Restricted access</b><small>Every admission is tied to the signed-in staff account</small></span></div></form></div></main>;
}
