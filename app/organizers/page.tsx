import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { nasaClient } from "@/lib/services/nasa-client";

export const metadata: Metadata = { title: "Event organizers" };

export default async function OrganizersPage() {
  const organizers = await nasaClient.listOrganizers();
  return <><PublicHeader /><main className="public-main"><section className="page-hero"><div className="page-hero__inner"><span className="eyebrow">Meet the people behind the moments</span><h1>Organizers worth following.</h1><p>Explore public portfolios, discover upcoming events and see the experience each organizer brings.</p></div></section><section className="public-section"><div className="page-shell organizer-grid">{organizers.map((organizer) => <article className="organizer-card" key={organizer.id}><div className="organizer-card__top"><span className="organizer-avatar" style={{ background: organizer.accent }}>{organizer.initials}</span>{organizer.verified && <span className="verified-badge" title="Verified organizer"><BadgeCheck size={17} /></span>}</div><h2>{organizer.name}</h2><p>{organizer.tagline}</p><div className="organizer-card__stats"><span><b>{organizer.eventsHosted}</b><small>Events</small></span><span><b>{(organizer.guestsWelcomed / 1000).toFixed(1)}k</b><small>Guests</small></span><span><b>{organizer.rating}</b><small>Rating</small></span></div><Link className="button button--outline" href={`/organizers/${organizer.slug}`}>View portfolio <ArrowRight size={15} /></Link></article>)}</div></section></main><PublicFooter /></>;
}
