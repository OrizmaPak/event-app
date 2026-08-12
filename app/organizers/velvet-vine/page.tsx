import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Globe2, Mail, MapPin } from "lucide-react";
import { EventCard } from "@/components/public/EventCard";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { events, featuredOrganizer } from "@/lib/data/mock-data";

export const metadata: Metadata = { title: "Velvet & Vine Experiences" };

export default function OrganizerPortfolioPage() {
  const organizerEvents = events.filter((event) => event.organizerId === featuredOrganizer.id && event.status === "published");
  return <><PublicHeader transparent /><main className="public-main"><section className="portfolio-hero"><div className="portfolio-hero__inner"><div className="portfolio-monogram">VV</div><div><span className="eyebrow eyebrow--light"><BadgeCheck size={14} /> Verified organizer</span><h1>{featuredOrganizer.name}</h1><p>{featuredOrganizer.tagline}</p><div className="portfolio-meta"><span><MapPin size={15} />{featuredOrganizer.city}</span><span><Globe2 size={15} />{featuredOrganizer.website}</span><span><Mail size={15} />{featuredOrganizer.email}</span></div></div></div></section><section className="public-section"><div className="page-shell portfolio-overview"><article className="portfolio-about"><span className="eyebrow">Our story</span><h2>We make every guest feel considered.</h2><p>{featuredOrganizer.bio}</p><p>Our portfolio page gives guests one trusted place to discover what is coming next and revisit experiences we have already created.</p><Link className="button button--brand" href="/contact">Contact organizer <ArrowRight size={15} /></Link></article><div className="portfolio-stat-grid"><div><b>{featuredOrganizer.eventsHosted}</b><span>Events created</span></div><div><b>12.4k</b><span>Guests welcomed</span></div><div><b>{featuredOrganizer.rating}</b><span>Guest rating</span></div><div><b>8 yrs</b><span>Creating moments</span></div></div></div></section><section className="public-section public-section--paper"><div className="page-shell"><div className="section-heading"><span className="eyebrow">Upcoming experiences</span><h2>Join us at the next one.</h2></div><div className="event-card-grid">{organizerEvents.map((event) => <EventCard key={event.id} event={event} />)}</div></div></section></main><PublicFooter /></>;
}
