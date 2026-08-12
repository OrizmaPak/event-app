"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { EventCategory, EventRecord } from "@/lib/data/types";
import { EventCard } from "./EventCard";

const categories: Array<"All" | EventCategory> = ["All", "Celebration", "Business", "Culture", "Community", "Wedding"];

export function EventExplorer({ events }: { events: EventRecord[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");

  const results = useMemo(() => events.filter((event) => {
    const matchesCategory = category === "All" || event.category === category;
    const haystack = `${event.title} ${event.city} ${event.venue} ${event.category}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [events, query, category]);

  return (
    <>
      <div className="explorer-controls">
        <label className="search-field"><Search size={18} /><span className="sr-only">Search events</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, places or organizers" /></label>
        <button className="button button--outline" type="button"><SlidersHorizontal size={17} /> Filters</button>
      </div>
      <div className="filter-chips" aria-label="Filter event category">
        {categories.map((item) => <button key={item} className={item === category ? "active" : ""} onClick={() => setCategory(item)} type="button">{item}</button>)}
      </div>
      <p className="result-count">{results.length} event{results.length === 1 ? "" : "s"} found</p>
      <div className="event-card-grid">
        {results.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
      {results.length === 0 && <div className="empty-state"><Search size={24} /><h3>No events found</h3><p>Try a different event name, place or category.</p></div>}
    </>
  );
}
