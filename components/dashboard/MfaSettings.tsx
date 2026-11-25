"use client";

import { Check, Copy, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function MfaSettings() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ factorId: string; manualKey: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/v1/auth/mfa/setup").then((response) => response.json() as Promise<{ data?: { enabled?: boolean } }>).then((body) => setEnabled(Boolean(body.data?.enabled))).catch(() => setEnabled(false)); }, []);
  async function begin() {
    setError("");
    setBusy(true);
    try {
    const response = await fetch("/api/v1/auth/mfa/setup", { method: "POST" });
    const body = await response.json() as { data: { factorId: string; manualKey: string; uri: string }; error?: { message?: string } };
    if (!response.ok) { setError(body.error?.message ?? "MFA setup could not start."); return; }
    setSetup(body.data);
    } catch { setError("Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (!setup) return;
    setError("");
    setBusy(true);
    try {
    const response = await fetch("/api/v1/auth/mfa/setup", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ factorId: setup.factorId, code }) });
    const body = await response.json() as { data: { recoveryCodes: string[] }; error?: { message?: string } };
    if (!response.ok) { setError(body.error?.message ?? "The code is invalid."); return; }
    setRecoveryCodes(body.data.recoveryCodes); setEnabled(true); setSetup(null);
    } catch { setError("Unable to verify the code. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="security-settings"><header><span><ShieldCheck size={22} /></span><div><small>ACCOUNT SECURITY</small><h2>Multi-factor authentication</h2><p>Required for platform administrators and recommended for workspace owners.</p></div>{enabled && <em><Check size={14} /> Enabled</em>}</header>{error && <div className="form-error" role="alert">{error}</div>}{enabled === false && !setup && <button type="button" className="button button--brand" disabled={busy} onClick={begin}>Set up authenticator</button>}{setup && <div className="mfa-setup"><QRCodeSVG value={setup.uri} size={192} marginSize={4} title="Scan with your authenticator app" /><p>In your authenticator app, add an account manually using this setup key, then enter the six-digit code it generates.</p><div className="mfa-manual-key"><code>{setup.manualKey}</code><button type="button" aria-label="Copy setup key" onClick={() => navigator.clipboard.writeText(setup.manualKey)}><Copy size={16} /></button></div><label className="field"><span>Authentication code</span><input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></label><button className="button button--brand" type="button" disabled={busy || code.length !== 6} onClick={verify}>Verify and enable</button></div>}{recoveryCodes.length > 0 && <div className="recovery-codes"><h3>Store these recovery codes securely</h3><p>Each code can be used once if your authenticator is unavailable.</p><div>{recoveryCodes.map((item) => <code key={item}>{item}</code>)}</div><button className="button button--quiet" type="button" onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))}><Copy size={16} /> Copy codes</button></div>}</section>;
}
