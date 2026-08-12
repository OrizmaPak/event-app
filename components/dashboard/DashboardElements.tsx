"use client";

import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Share2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { events } from "@/lib/data/mock-data";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="dashboard-page-head"><div>{eyebrow && <span className="dashboard-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="dashboard-page-head__actions">{actions}</div>}</div>;
}

const tabs = [
  ["Overview", "/organizer/events/lumina-gala"],
  ["Guests", "/organizer/events/lumina-gala/guests"],
  ["Seating", "/organizer/events/lumina-gala/seating"],
  ["Messages", "/organizer/events/lumina-gala/messages"],
  ["Check-in", "/organizer/events/lumina-gala/check-in"],
  ["Analytics", "/organizer/events/lumina-gala/analytics"],
];

export function EventManagementHeader() {
  const pathname = usePathname();
  return <section className="event-management-head"><div className="event-management-head__top"><div className="event-mini-cover"><i /><span>LUMINA</span></div><div><span className="dashboard-eyebrow">Celebration · Published</span><h1>The Lumina Gala 2026</h1><p>24 August · 6:00 PM · The Monarch, Lagos</p></div><div className="event-management-head__actions"><Link className="button button--outline button--small" href="/events/lumina-gala" target="_blank">Preview <ExternalLink size={14} /></Link><MockButton label="Share event" icon={<Share2 size={14} />} /></div></div><nav className="event-tabs" aria-label="Event management sections">{tabs.map(([label, href]) => <Link key={href} className={pathname === href ? "active" : ""} href={href}>{label}</Link>)}</nav></section>;
}

export function MockButton({ label, success = "Done", icon, className = "button button--outline button--small" }: { label: string; success?: string; icon?: React.ReactNode; className?: string }) {
  const [done, setDone] = useState(false);
  return <button className={className} type="button" onClick={() => { setDone(true); window.setTimeout(() => setDone(false), 1800); }}>{done ? <><Check size={14} /> {success}</> : <>{icon}{label}</>}</button>;
}

export function EventSelector() {
  const [selectedEventId, setSelectedEventId] = useState(events[0].id);
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) ?? events[0], [selectedEventId]);

  useEffect(() => {
    const storedEventId = window.localStorage.getItem("nasa-selected-event");
    if (storedEventId && events.some((event) => event.id === storedEventId)) {
      setSelectedEventId(storedEventId);
    }

    function update(event: Event) {
      const selected = (event as CustomEvent<string>).detail;
      if (selected && events.some((item) => item.id === selected)) setSelectedEventId(selected);
    }

    window.addEventListener("nasa-selected-event-change", update);
    return () => window.removeEventListener("nasa-selected-event-change", update);
  }, []);

  return <button className="event-selector" type="button"><span><small>SHOWING DATA FOR</small><b>{selectedEvent.title}</b></span><ChevronDown size={16} /></button>;
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "mint" | "coral" | "gold" }) {
  return <div className={`progress-bar progress-bar--${tone}`} aria-label={`${value}%`}><i style={{ width: `${value}%` }} /></div>;
}
