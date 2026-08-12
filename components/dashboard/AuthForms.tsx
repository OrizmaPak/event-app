"use client";

import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const search = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("john@nasaevent.demo");
  const [password, setPassword] = useState("demo1234");
  const [busy, setBusy] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    window.localStorage.setItem("nasa-organizer-session", JSON.stringify({ email, name: "John Oreva", role: "Owner", mode: "mock" }));
    window.setTimeout(() => { window.location.href = search.get("returnTo") || "/organizer"; }, 550);
  }

  return <form className="auth-form" onSubmit={submit}><span className="eyebrow">Welcome back</span><h1>Sign in to your workspace.</h1><p>Manage events, guests, seating and your event-day team from one clear dashboard.</p><label className="auth-field"><span>Email address</span><div><Mail size={17} /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><label className="auth-field"><span>Password <Link href="/organizer/forgot-password">Forgot password?</Link></span><div><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><label className="remember-row"><input type="checkbox" defaultChecked /><span>Keep me signed in on this device</span></label><button className="button button--brand button--large auth-submit" type="submit">{busy ? "Opening workspace…" : <>Sign in <ArrowRight size={17} /></>}</button><div className="mock-credential-note"><Sparkles size={16} /><span><b>Demo login is pre-filled.</b> Click Sign in—no real account is required.</span></div><p className="auth-switch">New to NASA EVENT? <Link href="/organizer/register">Create an organizer account</Link></p></form>;
}

export function RegisterForm() {
  const [busy, setBusy] = useState(false);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    window.localStorage.setItem("nasa-organizer-session", JSON.stringify({ email: "john@nasaevent.demo", name: "John Oreva", role: "Owner", mode: "mock" }));
    window.setTimeout(() => { window.location.href = "/organizer/onboarding"; }, 550);
  }
  return <form className="auth-form" onSubmit={submit}><span className="eyebrow">Start organizing</span><h1>Create your organizer account.</h1><p>You&apos;ll set up your public profile next. You can change every detail later.</p><div className="field-grid"><label className="auth-field"><span>First name</span><div><input required defaultValue="John" /></div></label><label className="auth-field"><span>Last name</span><div><input required defaultValue="Oreva" /></div></label><label className="auth-field field--full"><span>Email address</span><div><Mail size={17} /><input required type="email" defaultValue="john@nasaevent.demo" /></div></label><label className="auth-field field--full"><span>Create password</span><div><LockKeyhole size={17} /><input required type="password" defaultValue="demo1234" /></div><small>Use at least 8 characters.</small></label></div><label className="remember-row"><input required type="checkbox" defaultChecked /><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Notice</Link>.</span></label><button className="button button--brand button--large auth-submit" type="submit">{busy ? "Creating account…" : <>Create account <ArrowRight size={17} /></>}</button><p className="auth-switch">Already have an account? <Link href="/organizer/login">Sign in</Link></p></form>;
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  if (sent) return <div className="auth-form auth-form--success"><span className="auth-success-icon"><Check size={25} /></span><span className="eyebrow">Email prepared</span><h1>Check your inbox.</h1><p>In a real environment, we would send a secure reset link to your email address. This mock flow stops here.</p><Link className="button button--brand button--large auth-submit" href="/organizer/login">Return to sign in <ArrowRight size={16} /></Link></div>;
  return <form className="auth-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><span className="eyebrow">Password help</span><h1>Reset your password.</h1><p>Enter the email address connected to your organizer account.</p><label className="auth-field"><span>Email address</span><div><Mail size={17} /><input required type="email" defaultValue="john@nasaevent.demo" /></div></label><button className="button button--brand button--large auth-submit" type="submit">Send reset link <ArrowRight size={17} /></button><p className="auth-switch"><Link href="/organizer/login">← Back to sign in</Link></p></form>;
}

export function AuthFeatureList() {
  return <div className="auth-showcase"><span className="eyebrow eyebrow--light">One connected workspace</span><h2>Everything comes together before the doors open.</h2><div className="auth-showcase__list"><p><span><Check size={16} /></span><b>Publish beautiful event pages</b></p><p><span><Check size={16} /></span><b>Know every guest and seat</b></p><p><span><Check size={16} /></span><b>Prepare your event-day team</b></p></div><div className="auth-showcase__card"><ShieldCheck size={24} /><span><small>YOUR NEXT EVENT</small><b>Clear, calm and ready.</b></span></div></div>;
}
