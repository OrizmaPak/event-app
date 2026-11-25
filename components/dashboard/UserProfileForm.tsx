"use client";

import { Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export function UserProfileForm() {
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/v1/account/profile").then((response) => response.json()).then((payload: unknown) => { const data = payload as { data?: typeof profile }; if (data.data) setProfile({ ...data.data, phone: data.data.phone ?? "" }); }).catch(() => setError("Unable to load your profile.")); }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setMessage(""); setError(""); const response = await fetch("/api/v1/account/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(profile) }); const payload = await response.json().catch(() => ({})) as { data?: typeof profile; error?: { message?: string } }; if (!response.ok) setError(payload.error?.message ?? "Unable to save your profile."); else { setMessage("Profile saved"); if (payload.data) setProfile({ ...payload.data, phone: payload.data.phone ?? "" }); } setBusy(false); }
  return <form className="dashboard-panel user-profile-form" onSubmit={save}><span className="metric-icon metric-icon--violet"><UserRound size={19} /></span>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success">{message}</div>}<div className="field-grid"><label className="field"><span>First name</span><input required value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} /></label><label className="field"><span>Last name</span><input required value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} /></label><label className="field field--full"><span>Email address</span><input value={profile.email} disabled /></label><label className="field field--full"><span>Phone number <small>Optional</small></span><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label></div><button className="button button--brand" disabled={busy} type="submit"><Save size={15} />{busy ? "Saving…" : "Save profile"}</button></form>;
}
