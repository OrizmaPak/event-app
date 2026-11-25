"use client";

import { ArrowRight, Building2 } from "lucide-react";
import { useState } from "react";

export function CreateOrganizationForm() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const response = await fetch("/api/v1/account/organizations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) as { error?: { message?: string } } | null : null;
    if (!response?.ok) { setError(payload?.error?.message ?? "Unable to create the organization."); setBusy(false); return; }
    setCreated(true); setBusy(false);
  }

  if (created) return <section className="dashboard-panel account-create-success"><span className="metric-icon metric-icon--mint"><Building2 size={20} /></span><h2>Organization submitted</h2><p>Your organization is now awaiting platform approval. You can still update your personal profile while approval is in progress.</p></section>;
  return <form className="dashboard-panel account-create-form" onSubmit={submit}><span className="metric-icon metric-icon--violet"><Building2 size={20} /></span><small>ORGANIZATION SETUP</small><h2>Create an organization</h2><p>Start with the organization name. You will complete its public profile later from the organizer workspace.</p>{error && <div className="form-error" role="alert">{error}</div>}<label className="field"><span>Organization name</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Lumen Events" /></label><button className="button button--brand" type="submit" disabled={busy}>{busy ? "Creating…" : <>Create organization <ArrowRight size={15} /></>}</button></form>;
}
