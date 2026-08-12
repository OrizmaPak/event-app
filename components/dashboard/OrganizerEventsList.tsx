"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Copy, MoreHorizontal, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { EventRecord } from "@/lib/data/types";
import { EventPoster } from "@/components/public/EventPoster";

export function OrganizerEventsList({ events }: { events: EventRecord[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [notice, setNotice] = useState("");

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
              <span className={`pill ${event.status === "published" ? "pill--success" : "pill--warning"}`}>{event.status}</span>
              <button type="button" aria-label="More options"><MoreHorizontal size={17} /></button>
            </div>
            <div className="organizer-event-card__body">
              <h2>{event.title}</h2>
              <p><CalendarDays size={14} />{event.dateLabel} · {event.timeLabel.split(" – ")[0]}</p>
              <p><UsersRound size={14} />{event.confirmed} confirmed of {event.capacity}</p>
              <div className="organizer-event-card__foot">
                <Link className="button button--brand button--small" href={`/organizer/events/${event.slug}`} onClick={() => chooseEvent(event.id)}>Manage event</Link>
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
