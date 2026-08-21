"use client";

import { Check, Copy, KeyRound, Mail, Plus, RefreshCw, Search, Send, ShieldOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface InvitationRecord { id: string; guestName: string; email: string; phone?: string | null; partyAllowance: number; personalization: Record<string, unknown>; status: string; deliveryStatus: string; lastSentAt?: string | null; createdAt: string; revokedAt?: string | null }

export function InvitationManager({ eventSlug, eventTitle }: { eventSlug: string; eventTitle: string }) {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ guestName: string; email: string; code: string } | null>(null);
  const [customFields, setCustomFields] = useState([{ id: "detail-1", label: "Invitation note", value: "We have reserved a place especially for you." }]);
  const results = useMemo(() => invitations.filter((item) => `${item.guestName} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [invitations, query]);

  async function load() { const response = await fetch(`/api/organizer/events/${eventSlug}/invitations`); const payload: any = await response.json(); if (response.ok) setInvitations(payload.data); else setError(payload.error?.message ?? "Unable to load invitations."); }
  useEffect(() => { void load(); }, [eventSlug]);
  function feedback(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2600); }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const personalization = Object.fromEntries(customFields.filter((field) => field.label.trim()).map((field) => [field.label.trim(), field.value.trim()]));
    const body = { guestName: form.get("guestName"), email: form.get("email"), phone: form.get("phone"), partyAllowance: Number(form.get("partyAllowance")), sendNow: form.get("sendNow") === "on", personalization };
    const response = await fetch(`/api/organizer/events/${eventSlug}/invitations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload: any = await response.json(); setBusy(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to prepare the invitation."); return; }
    setCreated({ guestName: String(body.guestName), email: String(body.email), code: payload.data.code }); setOpen(false); await load(); feedback(body.sendNow ? "Invitation queued for email delivery" : "Invitation saved as a draft");
  }

  async function action(id: string, actionName: "send-new-code" | "revoke") {
    const response = await fetch(`/api/organizer/invitations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: actionName }) });
    const payload: any = await response.json();
    if (!response.ok) { setError(payload.error?.message ?? "Unable to update the invitation."); return; }
    if (payload.data.code) { const item = invitations.find((invite) => invite.id === id)!; setCreated({ guestName: item.guestName, email: item.email, code: payload.data.code }); }
    await load(); feedback(actionName === "revoke" ? "Invitation revoked" : "A replacement code is queued");
  }

  return <section className="invitation-manager">
    <div className="guest-summary-row"><div><b>{invitations.length}</b><small>Invited</small></div><div><b>{invitations.filter((item) => item.deliveryStatus === "queued").length}</b><small>Email queued</small></div><div><b>{invitations.filter((item) => item.status === "confirmed").length}</b><small>Confirmed</small></div><div><b>{invitations.filter((item) => item.status === "pending").length}</b><small>Awaiting response</small></div><div><b>{invitations.reduce((sum, item) => sum + item.partyAllowance, 0)}</b><small>Reserved places</small></div></div>
    <article className="dashboard-panel invitation-panel"><header><div><span className="dashboard-eyebrow">Private guest access</span><h2>Named invitations</h2><p>Every guest uses their email and a unique code. Codes are shown only when created or replaced.</p></div><button className="button button--brand" type="button" onClick={() => { setOpen(true); setError(""); }}><Plus size={15} /> Add invitation</button></header><div className="invitation-tools"><label className="dashboard-input"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guest or email" /></label><span><KeyRound size={15} /> Unique codes · email delivery outbox</span></div><div className="invitation-list">{results.map((item) => <article key={item.id}><span className="guest-avatar">{item.guestName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><b>{item.guestName}</b><small>{item.email}</small></div><span><small>PLACES</small><b>{item.partyAllowance}</b></span><em className={`pill ${item.revokedAt ? "pill--danger" : item.deliveryStatus === "queued" ? "pill--warning" : "pill--neutral"}`}>{item.revokedAt ? "Revoked" : item.deliveryStatus}</em><div className="invitation-actions"><button type="button" onClick={() => action(item.id, "send-new-code")} disabled={Boolean(item.revokedAt)} title="Generate and queue a new code"><RefreshCw size={14} /> New code</button><button type="button" onClick={() => action(item.id, "revoke")} disabled={Boolean(item.revokedAt)} title="Revoke invitation"><ShieldOff size={14} /></button></div></article>)}</div>{results.length === 0 && <div className="empty-state"><Mail size={24} /><h3>No invitations found</h3><p>Add a named guest or change the search.</p></div>}</article>
    {open && <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Create private invitation"><form onSubmit={create}><header><div><span className="modal-icon"><Mail size={19} /></span><h2>Create a named invitation</h2><p>The guest receives a unique code for {eventTitle}.</p></div><button type="button" onClick={() => setOpen(false)}><X size={19} /></button></header><div className="field-grid"><label className="field field--full"><span>Guest full name</span><input name="guestName" required placeholder="Guest full name" /></label><label className="field"><span>Email address</span><input name="email" required type="email" placeholder="guest@example.com" /></label><label className="field"><span>Phone number <small>Optional</small></span><input name="phone" placeholder="+234" /></label><label className="field"><span>Places reserved</span><input name="partyAllowance" type="number" min="1" max="50" defaultValue="1" /></label><label className="field"><span>RSVP deadline</span><input type="date" onChange={(event) => setCustomFields((fields) => [...fields.filter((field) => field.label !== "RSVP deadline"), { id: "rsvp-deadline", label: "RSVP deadline", value: event.target.value }])} /></label></div><section className="invitation-personalization"><header><div><b>Personal invitation details</b><small>Add any information that should be shown only to this guest.</small></div><button type="button" onClick={() => setCustomFields((fields) => [...fields, { id: `detail-${Date.now()}`, label: "", value: "" }])}><Plus size={14} /> Add detail</button></header>{customFields.map((field) => <div key={field.id}><input value={field.label} onChange={(event) => setCustomFields((fields) => fields.map((item) => item.id === field.id ? { ...item, label: event.target.value } : item))} placeholder="Detail label" /><input value={field.value} onChange={(event) => setCustomFields((fields) => fields.map((item) => item.id === field.id ? { ...item, value: event.target.value } : item))} placeholder="What this guest should see" /><button type="button" onClick={() => setCustomFields((fields) => fields.filter((item) => item.id !== field.id))}><X size={14} /></button></div>)}</section><label className="remember-row"><input name="sendNow" type="checkbox" defaultChecked /> Queue the invitation email after saving</label>{error && <p className="form-error" role="alert">{error}</p>}<footer><button className="button button--quiet" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="button button--brand" type="submit" disabled={busy}>{busy ? "Preparing…" : <><Send size={14} /> Create invitation</>}</button></footer></form></div>}
    {created && <div className="invitation-code-modal" role="dialog" aria-modal="true" aria-label="Invitation code created"><div><span><Check size={22} /></span><small>CODE CREATED FOR</small><h2>{created.guestName}</h2><p>{created.email}</p><b>{created.code}</b><em>For security, this code is shown only now. The database stores a hash.</em><button type="button" onClick={() => { void navigator.clipboard.writeText(created.code); feedback("Invitation code copied"); }}><Copy size={15} /> Copy code</button><button type="button" onClick={() => setCreated(null)}>Done</button></div></div>}
    {notice && <div className="toast-message"><Check size={15} /> {notice}</div>}
  </section>;
}
