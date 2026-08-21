"use client";

import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Share2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { events } from "@/lib/data/mock-data";
import type { EventRecord } from "@/lib/data/types";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="dashboard-page-head"><div>{eyebrow && <span className="dashboard-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="dashboard-page-head__actions">{actions}</div>}</div>;
}

export function EventManagementHeader({ event: eventProp }: { event?: EventRecord } = {}) {
  const pathname = usePathname();
  const routeSlug = pathname.match(/\/organizer\/events\/([^/]+)/)?.[1];
  const event = eventProp ?? events.find((item) => item.slug === routeSlug) ?? events[0];
  const base = `/organizer/events/${event.slug}`;
  const tabs = [["Overview", base], ["Page design", `${base}/page-design`], [event.visibility === "private" ? "Invitations" : "Guests", `${base}/guests`], ...(event.slug === "lumina-gala" ? [["Seating", `${base}/seating`], ["Messages", `${base}/messages`], ["Check-in", `${base}/check-in`], ["Analytics", `${base}/analytics`]] : [])];
  return <section className="event-management-head"><div className="event-management-head__top"><div className={`event-mini-cover event-mini-cover--${event.cover}`}><i /><span>{event.shortTitle.slice(0, 10).toUpperCase()}</span></div><div><span className="dashboard-eyebrow">{event.category} · {event.status}</span><h1>{event.title}</h1><p>{event.dateLabel.replace(/^\w+, /, "")} · {event.timeLabel.split(" – ")[0]} · {event.venue}</p></div><div className="event-management-head__actions"><Link className="button button--outline button--small" href={`/events/${event.slug}`} target="_blank">Preview <ExternalLink size={14} /></Link><MockButton label="Share event" icon={<Share2 size={14} />} /></div></div><nav className="event-tabs" aria-label="Event management sections">{tabs.map(([label, href]) => <Link key={href} className={pathname === href ? "active" : ""} href={href}>{label}</Link>)}</nav></section>;
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
