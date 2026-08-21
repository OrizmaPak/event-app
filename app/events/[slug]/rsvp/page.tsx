import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { RsvpFlow } from "@/components/public/RsvpFlow";
import { Brand } from "@/components/shared/Brand";
import { nasaClient } from "@/lib/services/nasa-client";
import { invitationCookieName, verifyInvitationAccessToken } from "@/lib/security/invitations";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  return { title: event ? `RSVP · ${event.title}` : "RSVP" };
}

export default async function RsvpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event || event.status !== "published") notFound();
  if (event.visibility === "private") {
    const token = (await cookies()).get(invitationCookieName(event.id))?.value;
    const access = token ? await verifyInvitationAccessToken(token) : null;
    if (!access || access.eventId !== event.id) redirect(`/events/${event.slug}`);
  }

  return <main className="rsvp-page"><header className="rsvp-header"><Brand /><Link href={`/events/${event.slug}`}>Exit RSVP</Link></header><div className="rsvp-layout"><aside className="rsvp-event-panel"><div className="rsvp-event-art" style={{ background: event.accent }}><small>YOU&apos;RE INVITED TO</small><h2>{event.shortTitle}</h2><span>{event.eyebrow}</span></div><div className="rsvp-event-meta"><p><CalendarDays size={17} /><span><small>DATE & TIME</small><b>{event.dateLabel.split(", ")[1] ?? event.dateLabel} · {event.timeLabel.split("–")[0].trim()}</b></span></p><p><MapPin size={17} /><span><small>VENUE</small><b>{event.venue}, {event.city}</b></span></p></div></aside><section className="rsvp-form-panel"><RsvpFlow eventSlug={event.slug} /></section></div></main>;
}
