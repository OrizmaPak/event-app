import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import type { EventRecord } from "@/lib/data/types";
import { EventPoster } from "./EventPoster";

export function EventCard({ event }: { event: EventRecord }) {
  return (
    <article className="event-card">
      <Link className="event-card__poster" href={`/events/${event.slug}`} aria-label={`View ${event.title}`}><EventPoster event={event} compact /></Link>
      <div className="event-card__body">
        <span className="pill pill--soft">{event.category}</span>
        <h3><Link href={`/events/${event.slug}`}>{event.title}</Link></h3>
        <p><CalendarDays size={15} />{event.dateLabel} · {event.timeLabel.split(" – ")[0]}</p>
        <p><MapPin size={15} />{event.venue}, {event.city}</p>
        <div className="event-card__foot"><span><Users size={15} /> {event.confirmed} attending</span><Link href={`/events/${event.slug}`}>View event <ArrowUpRight size={15} /></Link></div>
      </div>
    </article>
  );
}
