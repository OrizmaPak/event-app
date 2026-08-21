import Link from "next/link";
import { ArrowUpRight, CalendarDays, LockKeyhole, MapPin, Users } from "lucide-react";
import type { EventRecord } from "@/lib/data/types";
import { EventPoster } from "./EventPoster";

export function EventCard({ event }: { event: EventRecord }) {
  const admissionLabel = event.admissionMode === "selectable" ? "Pick seats" : event.admissionMode === "assigned" ? "Seats assigned" : "General admission";
  const pricingLabel = event.pricingMode === "free" ? "Free" : "Paid";

  return (
    <article className="event-card">
      <Link className="event-card__poster" href={`/events/${event.slug}`} aria-label={`View ${event.title}`}><EventPoster event={event} compact /></Link>
      <div className="event-card__body">
        <div className="event-card__badges"><span className="pill pill--soft">{event.category}</span>{event.visibility === "private" && <span className="pill pill--neutral"><LockKeyhole size={12} /> Invitation required</span>}<span className="pill pill--neutral">{admissionLabel}</span><span className={event.pricingMode === "free" ? "pill pill--success" : "pill pill--warning"}>{pricingLabel}</span></div>
        <h3><Link href={`/events/${event.slug}`}>{event.title}</Link></h3>
        <p><CalendarDays size={15} />{event.dateLabel} · {event.timeLabel.split(" – ")[0]}</p>
        <p><MapPin size={15} />{event.venue}, {event.city}</p>
        <div className="event-card__foot"><span><Users size={15} /> {event.visibility === "private" ? "Named guests only" : `${event.confirmed} attending`}</span><Link href={`/events/${event.slug}`}>View event <ArrowUpRight size={15} /></Link></div>
      </div>
    </article>
  );
}
