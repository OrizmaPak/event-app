import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Mail, MapPin } from "lucide-react";
import { EventCard } from "@/components/public/EventCard";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { events } from "@/lib/data/mock-data";
import { nasaClient } from "@/lib/services/nasa-client";

export default async function GenericOrganizerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const organizer = await nasaClient.getOrganizer(slug);
  if (!organizer) notFound();
  const organizerEvents = events.filter((event) => event.organizerId === organizer.id && event.status === "published");
  return <><PublicHeader transparent /><main className="public-main"><section className="portfolio-hero"><div className="portfolio-hero__inner"><div className="portfolio-monogram" style={{ background: organizer.accent }}>{organizer.initials}</div><div><span className="eyebrow eyebrow--light"><BadgeCheck size={14} /> Verified organizer</span><h1>{organizer.name}</h1><p>{organizer.tagline}</p><div className="portfolio-meta"><span><MapPin size={15} />{organizer.city}</span><span><Mail size={15} />{organizer.email}</span></div></div></div></section><section className="public-section"><div className="page-shell portfolio-overview"><article className="portfolio-about"><span className="eyebrow">Our story</span><h2>Gatherings made with intention.</h2><p>{organizer.bio}</p><Link className="button button--brand" href="/contact">Contact organizer</Link></article><div className="portfolio-stat-grid"><div><b>{organizer.eventsHosted}</b><span>Events created</span></div><div><b>{(organizer.guestsWelcomed/1000).toFixed(1)}k</b><span>Guests welcomed</span></div><div><b>{organizer.rating}</b><span>Guest rating</span></div><div><b>Verified</b><span>Organizer status</span></div></div></div></section>{organizerEvents.length > 0 && <section className="public-section public-section--paper"><div className="page-shell"><div className="section-heading"><span className="eyebrow">Published events</span><h2>Join the next gathering.</h2></div><div className="event-card-grid">{organizerEvents.map((event) => <EventCard key={event.id} event={event} />)}</div></div></section>}</main><PublicFooter /></>;
}
