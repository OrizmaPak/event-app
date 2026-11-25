"use client";

import { Check, ChevronRight, Clock3, Mail, MessageSquareText, Send, Smartphone, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import type { EventRecord, Guest } from "@/lib/data/types";

const mergeTags = [
  { label: "First name", token: "{{first_name}}", sample: "Amara" },
  { label: "Last name", token: "{{last_name}}", sample: "Okafor" },
  { label: "Table", token: "{{table}}", sample: "Table 12" },
  { label: "Seat number", token: "{{seat_number}}", sample: "04" },
  { label: "Event name", token: "{{event_name}}", sample: "The Lumina Gala" },
];

function splitName(name: string) {
  const [firstName = "Guest", ...lastParts] = name.trim().split(/\s+/);
  return { firstName, lastName: lastParts.join(" ") || "Guest" };
}

export function MessageComposer({ event, guests }: { event: EventRecord; guests: Guest[] }) {
  const pendingCount = guests.filter((guest) => guest.rsvp === "pending").length;
  const confirmedCount = guests.filter((guest) => guest.rsvp === "confirmed").length;
  const checkedInCount = guests.filter((guest) => guest.checkIn === "checked-in").length;
  const templates = [
    { id: "reminder", title: "RSVP reminder", note: `For ${pendingCount} pending guest${pendingCount === 1 ? "" : "s"}`, subject: `A gentle reminder: ${event.title}`, body: "Hello {{first_name}} {{last_name}},\n\nWe would love to know if you can join us at {{event_name}} on {{event.dateLabel}}. Please use your invitation link to respond.\n\nWarmly,\nYour event team" },
    { id: "details", title: "Event details", note: `For ${confirmedCount} confirmed guest${confirmedCount === 1 ? "" : "s"}`, subject: `Everything you need for ${event.title}`, body: "Hello {{first_name}},\n\nWe are looking forward to welcoming you to {{event_name}}. Your table is {{table}} and your seat is {{seat_number}}. Venue details are ready in your confirmation email." },
    { id: "thankyou", title: "Thank you", note: `For ${checkedInCount} checked-in guest${checkedInCount === 1 ? "" : "s"}`, subject: `Thank you for joining ${event.title}`, body: "Hello {{first_name}},\n\nThank you for making {{event_name}} such a beautiful occasion. We are grateful you joined us." },
  ];
  const [activeId, setActiveId] = useState(templates[0].id);
  const active = templates.find((template) => template.id === activeId) ?? templates[0];
  const [subject, setSubject] = useState(active.subject);
  const [body, setBody] = useState(active.body.replace("{{event.dateLabel}}", event.dateLabel));
  const [channel, setChannel] = useState("email");
  const [sent, setSent] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  function select(template: typeof templates[number]) { setActiveId(template.id); setSubject(template.subject); setBody(template.body.replace("{{event.dateLabel}}", event.dateLabel)); setSent(false); }
  function insertTag(token: string) {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    const nextBody = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(nextBody);
    window.requestAnimationFrame(() => { if (textarea) { textarea.focus(); const cursor = start + token.length; textarea.setSelectionRange(cursor, cursor); } });
  }
  const sampleGuest = guests[0];
  const sampleName = splitName(sampleGuest?.name ?? "Amara Okafor");
  const previewValues: Record<string, string> = {
    "{{first_name}}": sampleName.firstName,
    "{{last_name}}": sampleName.lastName,
    "{{table}}": sampleGuest?.table ?? "Table 12",
    "{{seat_number}}": sampleGuest?.seat ?? "04",
    "{{event_name}}": event.title,
  };
  const previewBody = Object.entries(previewValues).reduce((value, [token, replacement]) => value.split(token).join(replacement), body);
  function send() { setSent(true); window.setTimeout(() => setSent(false), 2300); }
  const recipientLabel = active.id === "reminder" ? `${pendingCount} guest${pendingCount === 1 ? "" : "s"} awaiting response` : active.id === "details" ? `${confirmedCount} confirmed guest${confirmedCount === 1 ? "" : "s"}` : `${checkedInCount} checked-in guest${checkedInCount === 1 ? "" : "s"}`;
  return <div className="messages-layout"><aside className="message-templates"><div className="panel-heading"><div><small>TEMPLATES</small><h2>Start with a message</h2></div></div>{templates.map((template) => <button type="button" key={template.id} className={active.id === template.id ? "active" : ""} onClick={() => select(template)}><span><MessageSquareText size={17} /></span><p><b>{template.title}</b><small>{template.note}</small></p><ChevronRight size={15} /></button>)}<div className="delivery-summary"><Sparkles size={17} /><span><b>Delivery health</b><small>98.7% of recent messages delivered</small></span></div></aside><section className="message-composer dashboard-panel"><div className="composer-head"><div><span className="dashboard-eyebrow">Compose message</span><h2>{active.title}</h2></div><div className="channel-switch"><button className={channel === "email" ? "active" : ""} onClick={() => setChannel("email")}><Mail size={14} /> Email</button><button className={channel === "sms" ? "active" : ""} onClick={() => setChannel("sms")}><Smartphone size={14} /> SMS</button></div></div><div className="recipient-row"><span>TO</span><b>{recipientLabel}</b><button type="button">Change recipients</button></div><label className="field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label className="field"><span>Message</span><textarea ref={bodyRef} className="message-body" value={body} onChange={(event) => setBody(event.target.value)} /></label><div className="merge-tags"><span>Personalize:</span>{mergeTags.map((tag) => <button type="button" key={tag.token} onClick={() => insertTag(tag.token)}>+ {tag.label}</button>)}</div><div className="composer-actions"><span><Check size={14} /> Changes saved</span><button className="button button--outline" type="button"><Clock3 size={15} /> Schedule</button><button className="button button--brand" type="button" onClick={send}>{sent ? <><Check size={15} /> Prepared</> : <><Send size={15} /> Review & send</>}</button></div></section><aside className="message-preview"><div className="message-preview__device"><div className="message-preview__top"><span>NASA.EVENT</span><small>to {sampleName.firstName}</small></div><div className="message-preview__email"><small>{subject}</small><div className="email-brand"><i>N</i><b>{event.title}</b></div><p>{previewBody}</p><button type="button">View my invitation</button><small>{event.city} · {event.dateLabel}</small></div></div></aside>{sent && <div className="toast-message">Mock message prepared for review</div>}</div>;
}
