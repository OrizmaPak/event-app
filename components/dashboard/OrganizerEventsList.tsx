"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Copy, ExternalLink, MoreHorizontal, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { EventRecord } from "@/lib/data/types";
import { EventPoster } from "@/components/public/EventPoster";
import { EventShareButton } from "@/components/dashboard/EventOverviewTools";

export function OrganizerEventsList({ events, revenue }: { events: EventRecord[]; revenue?: Array<{ eventId: string; currency: string; collectedMinor: number; refundedMinor: number }> }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const money = (minor: number, currency = "NGN") => new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
  const totals = new Map<string, number>();
  if (revenue) {
    events.forEach((event) => { if (!totals.has(event.currency ?? "NGN")) totals.set(event.currency ?? "NGN", 0); });
    revenue.forEach((row) => totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.collectedMinor - row.refundedMinor));
  }

  const results = useMemo(
    () => events.filter((event) => (filter === "All" || event.status === filter.toLowerCase()) && event.title.toLowerCase().includes(query.toLowerCase())),
    [events, filter, query],
  );

  async function copyLink(event: EventRecord) {
    const link = `${window.location.origin}/events/${event.slug}`;

    try {
      await navigator.clipboard.writeText(link);
      setNotice(`${event.shortTitle} link copied`);
    } catch {
      setNotice("Event link copied");
    }

    window.setTimeout(() => setNotice(""), 1800);
  }

  function chooseEvent(eventId: string) {
    window.localStorage.setItem("nasa-selected-event", eventId);
    window.dispatchEvent(new CustomEvent("nasa-selected-event-change", { detail: eventId }));
  }

  return (
    <>
      {revenue && <section className="ea-portfolio-total" aria-label="Total event revenue"><div><small>Net collected revenue</small><strong>{totals.size ? [...totals].map(([currency, minor]) => money(Math.max(0, minor), currency)).join(" · ") : money(0, "NGN")}</strong><span>Paid ticket collections less processed refunds, before fees</span></div><Link href="/organizer/finance">Financial breakdown <ExternalLink size={16} /></Link></section>}
      <div className="organizer-list-tools">
        <div className="filter-chips">
          {["All", "Published", "Draft"].map((item) => (
            <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>
              {item} <span>{item === "All" ? events.length : events.filter((event) => event.status === item.toLowerCase()).length}</span>
            </button>
          ))}
        </div>
        <label className="dashboard-input">
          <Search size={16} />
          <input placeholder="Search your events" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>

      <div className="organizer-event-grid">
        {results.map((event) => (
          <article key={event.id} className="organizer-event-card">
            <div className="organizer-event-card__cover">
              <EventPoster event={event} compact />
              <span className={`pill ${event.status === "published" ? "pill--success" : "pill--warning"}`}>{event.status === "pending_approval" ? "awaiting approval" : event.status}</span>
              <button type="button" aria-label="More options"><MoreHorizontal size={17} /></button>
            </div>
            <div className="organizer-event-card__body">
              <h2>{event.title}</h2>
              <p><CalendarDays size={14} />{event.dateLabel} · {event.timeLabel.split(" – ")[0]}</p>
              <p><UsersRound size={14} />{event.confirmed} confirmed of {event.capacity}</p>
              {revenue && <div className="ea-event-revenue"><span>Revenue after refunds</span><b>{money(revenue.filter((row) => row.eventId === event.id).reduce((sum, row) => sum + row.collectedMinor - row.refundedMinor, 0), event.currency)}</b></div>}
              <div className="organizer-event-card__foot">
                <Link className="button button--brand button--small" href={`/organizer/events/${event.slug}`} onClick={() => chooseEvent(event.id)}>Manage event</Link>
                <Link className="button button--outline button--small" href={`/events/${event.slug}`} target="_blank"><ExternalLink size={13} /> Preview</Link>
                <EventShareButton eventTitle={event.title} url={`/events/${event.slug}`} />
                <button className="button button--outline button--small" type="button" onClick={() => copyLink(event)}>
                  <Copy size={13} /> Copy link
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {notice && <div className="toast-message toast-message--success" role="status"><CheckCircle2 size={18} /> {notice}</div>}
    </>
  );
}
