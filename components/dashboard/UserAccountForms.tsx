"use client";

import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";

export function AccountRegisterForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verificationPreview, setVerificationPreview] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (password !== confirmPassword) { setError("Passwords do not match."); setBusy(false); return; }
    const response = await fetch("/api/v1/auth/register-user", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: data.get("firstName"), lastName: data.get("lastName"), email: data.get("email"), password, confirmPassword, acceptedTerms: data.get("acceptedTerms") === "on" }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) as { data?: { verificationPreview?: string }; error?: { message?: string } } | null : null;
    if (!response?.ok) { setError(payload?.error?.message ?? "Unable to create the account."); setBusy(false); return; }
    setVerificationPreview(payload?.data?.verificationPreview ?? "");
    setBusy(false);
  }

  if (verificationPreview) return <div className="auth-form auth-form--success"><span className="auth-success-icon"><Check size={25} /></span><span className="eyebrow">Account created</span><h1>Verify your email.</h1><p>Your account is ready. Verify your email, then sign in to accept invitations or create an organization when you are ready.</p><a className="button button--brand button--large auth-submit" href={verificationPreview}>Open development verification link</a><Link className="auth-switch" href="/organizer/login">Return to sign in</Link></div>;
  return <form className="auth-form" onSubmit={submit}><span className="eyebrow">One NASA EVENT account</span><h1>Create your account.</h1><p>Start with your personal details. You can accept event invitations or create an organization later, without making a second account.</p>{error && <div className="form-error" role="alert">{error}</div>}<div className="field-grid"><label className="auth-field"><span>First name</span><div><input name="firstName" required autoComplete="given-name" /></div></label><label className="auth-field"><span>Last name</span><div><input name="lastName" required autoComplete="family-name" /></div></label><label className="auth-field field--full"><span>Email address</span><div><Mail size={17} /><input name="email" required type="email" autoComplete="email" /></div></label><label className="auth-field field--full"><span>Create password</span><div><LockKeyhole size={17} /><input name="password" required type={showPassword ? "text" : "password"} minLength={12} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><small>Use 12 or more characters with uppercase, lowercase and a number.</small></label><label className="auth-field field--full"><span>Confirm password</span><div><LockKeyhole size={17} /><input name="confirmPassword" required type={showConfirmPassword ? "text" : "password"} minLength={12} autoComplete="new-password" /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label></div><label className="remember-row"><input name="acceptedTerms" required type="checkbox" /><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Notice</Link>.</span></label><button className="button button--brand button--large auth-submit" disabled={busy} type="submit">{busy ? "Creating account…" : <>Create account <ArrowRight size={17} /></>}</button><p className="auth-switch">Already have an account? <Link href="/organizer/login">Sign in</Link></p></form>;
}

export const UserRegisterForm = AccountRegisterForm;
