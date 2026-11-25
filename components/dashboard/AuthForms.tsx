"use client";

import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { loginDestination } from "@/lib/auth/redirect";

export function LoginForm() {
  const search = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, mfaCode: mfaCode || undefined }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) as { data?: { platformMember?: boolean }; error?: { code?: string; message?: string } } | null : null;
    if (!response?.ok) {
      if (payload?.error?.code === "MFA_REQUIRED") setMfaRequired(true);
      setError(payload?.error?.message ?? "Unable to sign in. Please try again.");
      setBusy(false);
      return;
    }
    const returnTo = search.get("returnTo");
    window.location.href = payload?.data?.platformMember ? loginDestination(returnTo, true) : (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/account");
  }

  return <form className="auth-form" onSubmit={submit}><span className="eyebrow">Welcome back</span><h1>Sign in to NASA EVENT.</h1><p>One account gives you access to the organizations and events you are invited to, and lets you create an organization when needed.</p>{search.get("verified") === "success" && <div className="form-success">Your email is verified. You can sign in now.</div>}{search.get("verified") === "invalid" && <div className="form-error">That verification link is invalid or expired.</div>}{search.get("status") === "pending_approval" && <div className="form-error" role="alert"><b>Approval required.</b> Your organization is awaiting platform approval.</div>}{search.get("status") === "blocked" && <div className="form-error" role="alert">This organization account is currently blocked. Contact the platform administrator.</div>}{error && <div className="form-error" role="alert">{error}</div>}<label className="auth-field"><span>Email address</span><div><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><label className="auth-field"><span>Password <Link href="/organizer/forgot-password">Forgot password?</Link></span><div><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{mfaRequired && <label className="auth-field"><span>Authentication or recovery code</span><div><KeyRound size={17} /><input autoComplete="one-time-code" required maxLength={64} value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder="6-digit code" /></div></label>}<button className="button button--brand button--large auth-submit" disabled={busy} type="submit">{busy ? "Signing in…" : <>Sign in <ArrowRight size={17} /></>}</button><p className="auth-switch">New to NASA EVENT? <Link href="/organizer/register">Create an account</Link></p></form>;
}

export function RegisterForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [verificationPreview, setVerificationPreview] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: data.get("firstName"), lastName: data.get("lastName"), email: data.get("email"), password: data.get("password"), acceptedTerms: data.get("acceptedTerms") === "on" }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) as { data?: { verificationPreview?: string }; error?: { message?: string } } | null : null;
    if (!response?.ok) { setError(payload?.error?.message ?? "Unable to create the account."); setBusy(false); return; }
    setVerificationPreview(payload?.data?.verificationPreview ?? "");
    setCreated(true);
    setBusy(false);
  }
  if (created) return <div className="auth-form auth-form--success"><span className="auth-success-icon"><Check size={25} /></span><span className="eyebrow">Account created</span><h1>Verify your email.</h1><p>We sent a verification link to your email address. After verification, your organizer workspace will be available once a platform administrator approves the organization.</p>{verificationPreview && <a className="button button--brand button--large auth-submit" href={verificationPreview}>Open development verification link</a>}<Link className="auth-switch" href="/organizer/login">Return to sign in</Link></div>;
  return <form className="auth-form" onSubmit={submit}><span className="eyebrow">Start organizing</span><h1>Create your organizer account.</h1><p>You&apos;ll set up your public profile next. You can change every detail later.</p>{error && <div className="form-error" role="alert">{error}</div>}<div className="field-grid"><label className="auth-field"><span>First name</span><div><input name="firstName" required autoComplete="given-name" /></div></label><label className="auth-field"><span>Last name</span><div><input name="lastName" required autoComplete="family-name" /></div></label><label className="auth-field field--full"><span>Email address</span><div><Mail size={17} /><input name="email" required type="email" autoComplete="email" /></div></label><label className="auth-field field--full"><span>Create password</span><div><LockKeyhole size={17} /><input name="password" required type="password" minLength={12} autoComplete="new-password" /></div><small>Use 12 or more characters with uppercase, lowercase and a number.</small></label></div><label className="remember-row"><input name="acceptedTerms" required type="checkbox" /><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Notice</Link>.</span></label><button className="button button--brand button--large auth-submit" disabled={busy} type="submit">{busy ? "Creating account…" : <>Create account <ArrowRight size={17} /></>}</button><p className="auth-switch">Already have an account? <Link href="/organizer/login">Sign in</Link></p></form>;
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (sent) return <div className="auth-form auth-form--success"><span className="auth-success-icon"><Check size={25} /></span><span className="eyebrow">Request received</span><h1>Check your inbox.</h1><p>If an account exists for that address, we sent a secure password reset link.</p><Link className="button button--brand button--large auth-submit" href="/organizer/login">Return to sign in <ArrowRight size={16} /></Link></div>;
  return <form className="auth-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); const data = new FormData(event.currentTarget); await fetch("/api/v1/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email") }) }).catch(() => null); setSent(true); }}><span className="eyebrow">Password help</span><h1>Reset your password.</h1><p>Enter the email address connected to your organizer account.</p><label className="auth-field"><span>Email address</span><div><Mail size={17} /><input name="email" required type="email" autoComplete="email" /></div></label><button className="button button--brand button--large auth-submit" disabled={busy} type="submit">{busy ? "Sending…" : <>Send reset link <ArrowRight size={17} /></>}</button><p className="auth-switch"><Link href="/organizer/login">← Back to sign in</Link></p></form>;
}

export function ResetPasswordForm() {
  const search = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (done) return <div className="auth-form auth-form--success"><span className="auth-success-icon"><Check size={25} /></span><span className="eyebrow">Password updated</span><h1>Your account is secure.</h1><p>All existing sessions were signed out. Use your new password to continue.</p><Link className="button button--brand button--large auth-submit" href="/organizer/login">Sign in <ArrowRight size={16} /></Link></div>;
  return <form className="auth-form" onSubmit={async (event) => { event.preventDefault(); setError(""); const response = await fetch("/api/v1/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: search.get("token"), password }) }); const payload = await response.json() as { error?: { message?: string } }; if (!response.ok) { setError(payload.error?.message ?? "Unable to reset the password."); return; } setDone(true); }}><span className="eyebrow">Account security</span><h1>Choose a new password.</h1><p>This will sign your account out on every other device.</p>{error && <div className="form-error" role="alert">{error}</div>}<label className="auth-field"><span>New password</span><div><LockKeyhole size={17} /><input required type="password" minLength={12} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div><small>Use 12 or more characters with uppercase, lowercase and a number.</small></label><button className="button button--brand button--large auth-submit" type="submit">Update password <ArrowRight size={17} /></button></form>;
}

export function AuthFeatureList() {
  return <div className="auth-showcase"><span className="eyebrow eyebrow--light">One connected workspace</span><h2>Everything comes together before the doors open.</h2><div className="auth-showcase__list"><p><span><Check size={16} /></span><b>Publish beautiful event pages</b></p><p><span><Check size={16} /></span><b>Know every guest and seat</b></p><p><span><Check size={16} /></span><b>Prepare your event-day team</b></p></div><div className="auth-showcase__card"><ShieldCheck size={24} /><span><small>YOUR NEXT EVENT</small><b>Clear, calm and ready.</b></span></div></div>;
}
