import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, Music2, Sparkles, UsersRound } from "lucide-react";
import { EventPoster } from "@/components/public/EventPoster";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { organizers } from "@/lib/data/mock-data";
import { nasaClient } from "@/lib/services/nasa-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  return { title: event?.title ?? "Event" };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event || event.status !== "published") notFound();
  const organizer = organizers.find((item) => item.id === event.organizerId)!;
  const rsvpHref = "/events/lumina-gala/rsvp";

  return <><PublicHeader transparent /><main className="public-main"><section className="detail-hero"><div className="detail-hero__inner"><div className="detail-hero__copy"><span className="eyebrow eyebrow--light">{event.eyebrow}</span><h1>{event.title}</h1><p>{event.description}</p><div className="detail-meta"><div><CalendarDays size={19} /><span><small>Date</small><b>{event.dateLabel}</b></span></div><div><Clock3 size={19} /><span><small>Time</small><b>{event.timeLabel}</b></span></div><div><MapPin size={19} /><span><small>Venue</small><b>{event.venue}</b></span></div><div><UsersRound size={19} /><span><small>Attending</small><b>{event.confirmed} confirmed guests</b></span></div></div><Link className="button button--brand button--large" href={rsvpHref}>Respond to invitation <ArrowRight size={17} /></Link></div><div className="detail-hero__poster"><EventPoster event={event} /></div></div></section><section className="public-section"><div className="page-shell event-story-grid"><article className="event-story"><span className="eyebrow">About this event</span><h2>A night designed around connection.</h2><p>{event.longDescription}</p><p>Dress beautifully, arrive ready to meet someone new and keep your personal QR pass close—it will help our welcome team find your table in seconds.</p><div className="event-highlights"><div><Music2 size={21} /><b>Live performances</b><span>An intimate programme of music and special guest moments.</span></div><div><Sparkles size={21} /><b>Thoughtful details</b><span>From your invitation to your seat, every touchpoint has been considered.</span></div><div><CheckCircle2 size={21} /><b>Personal QR pass</b><span>Your confirmation email includes a unique pass for faster entry.</span></div><div><MapPin size={21} /><b>Easy arrival</b><span>Clear venue details and seating information before event day.</span></div></div></article><aside><div className="sticky-rsvp"><small>Invitation status</small><h3>Will you join us?</h3><p>It takes less than a minute. Your personal event pass is created immediately after you confirm.</p><div className="capacity-line"><div><i style={{ width: `${Math.round((event.confirmed / event.capacity) * 100)}%` }} /></div><span><b>{event.confirmed} attending</b><b>{event.capacity - event.confirmed} spaces left</b></span></div><Link className="button button--brand button--large" href={rsvpHref}>RSVP now <ArrowRight size={16} /></Link></div><div style={{ height: 14 }} /><div className="organizer-inline"><span className="organizer-avatar">{organizer.initials}</span><div><small>Organized by</small><b>{organizer.name}</b></div><Link href={`/organizers/${organizer.slug}`}>View profile</Link></div></aside></div></section></main><PublicFooter /></>;
}
