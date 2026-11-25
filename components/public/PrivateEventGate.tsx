"use client";
import { useState } from "react";

export function PrivateEventGate({ slug, title }: { slug: string; title: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="event-access"><form onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/access`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), code: data.get("code") }) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setError(body.error?.message ?? "Unable to verify your invitation."); return; }
      window.location.reload();
    } catch { setError("Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }}><small>PRIVATE EVENT</small><h1>{title}</h1><p>Enter the email and invitation code sent by your host.</p><label><span>Guest email</span><input name="email" type="email" autoComplete="email" required /></label><label><span>Invitation code</span><input name="code" autoComplete="one-time-code" required /></label>{error && <p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? "Verifying..." : "Open my invitation"}</button></form></main>;
}
