"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckInHeader } from "./CheckInHeader";

interface AssignedEvent {
  id: string;
  slug: string;
  title: string;
  venue: string;
  city?: string;
  category?: string;
  startAt: string;
  status: string;
}

function dateParts(value: string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("en-NG", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en-NG", { month: "short" }).format(date),
    date: new Intl.DateTimeFormat("en-NG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

export function EventSelection() {
  const [events, setEvents] = useState<AssignedEvent[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/v1/workspaces/current/events", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        data?: AssignedEvent[];
        error?: { message?: string };
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error?.message ?? "Unable to load assigned events.");
      }
      setEvents(body.data.filter((event) => event.status === "published"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load assigned events. Check your connection and try again.",
      );
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return events ?? [];
    return (events ?? []).filter((event) =>
      [event.title, event.venue, event.city, event.category]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [events, query]);

  return (
    <main className="checkin-selection">
      <CheckInHeader compact />
      <div className="checkin-selection__body">
        <div className="checkin-selection__topline">
          <span className="checkin-selection__eyebrow">
            <i /> EVENT-DAY OPERATIONS
          </span>
          <span className="checkin-selection__access">
            <ShieldCheck size={15} /> STAFF ACCESS
          </span>
        </div>

        <section className="checkin-selection__heading">
          <div>
            <h1>Choose your event.</h1>
            <p>Only events assigned to your staff account appear here.</p>
          </div>
          {events && (
            <span className="checkin-selection__count">
              <b>{events.length.toString().padStart(2, "0")}</b>
              <small>AVAILABLE<br />EVENTS</small>
            </span>
          )}
        </section>

        {events && events.length > 0 && (
          <label className="checkin-selection__search">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find an event or venue"
              aria-label="Search assigned events"
            />
          </label>
        )}

        {error && (
          <section className="checkin-selection__message checkin-selection__message--error" role="alert">
            <div><b>Events couldn’t load</b><p>{error}</p></div>
            <button type="button" onClick={() => void loadEvents()}>
              <RefreshCw size={16} /> Try again
            </button>
          </section>
        )}

        {!events && !error && (
          <div className="checkin-selection__skeletons" aria-label="Loading assigned events">
            {[0, 1].map((item) => <div key={item} />)}
          </div>
        )}

        {events?.length === 0 && !error && (
          <section className="checkin-selection__message">
            <div className="checkin-selection__empty-icon"><CalendarDays size={23} /></div>
            <b>No published events assigned</b>
            <p>When an event creator gives you check-in access, it will appear here.</p>
          </section>
        )}

        {events && events.length > 0 && filteredEvents.length === 0 && (
          <section className="checkin-selection__message">
            <div className="checkin-selection__empty-icon"><Search size={22} /></div>
            <b>No matching events</b>
            <p>Try a different event name or venue.</p>
          </section>
        )}

        {filteredEvents.length > 0 && (
          <div className="checkin-selection__list">
            {filteredEvents.map((event, index) => {
              const date = dateParts(event.startAt);
              return (
                <article className="assigned-event-card" key={event.id}>
                  <div className={`assigned-event-art assigned-event-art--${index % 3}`} aria-hidden="true">
                    <span>{(event.category || "EVENT").toUpperCase()}</span>
                    <b>{date.day}</b>
                    <small>{date.month.toUpperCase()}</small>
                    <i />
                  </div>
                  <div className="assigned-event-copy">
                    <span className="assigned-event-copy__status"><i /> PUBLISHED · ASSIGNED TO YOU</span>
                    <h2>{event.title}</h2>
                    <div className="assigned-event-copy__details">
                      <span><CalendarDays size={16} />{date.date}</span>
                      <span><Clock3 size={16} />{date.time}</span>
                      <span><MapPin size={16} />{[event.venue, event.city].filter(Boolean).join(", ")}</span>
                    </div>
                  </div>
                  <Link href={`/check-in/${event.slug}`} aria-label={`Open check-in for ${event.title}`}>
                    <span>Open check-in</span><ArrowRight size={18} />
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <footer className="checkin-selection__security">
          <ShieldCheck size={17} />
          <span><b>Private to your role</b><small>Your account only shows its assigned check-in events.</small></span>
        </footer>
      </div>
    </main>
  );
}
