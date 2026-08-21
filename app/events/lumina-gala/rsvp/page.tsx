import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { RsvpFlow } from "@/components/public/RsvpFlow";
import { Brand } from "@/components/shared/Brand";

export const metadata: Metadata = { title: "RSVP · The Lumina Gala" };

export default function RsvpPage() {
  return <main className="rsvp-page"><header className="rsvp-header"><Brand /><Link href="/events/lumina-gala">Exit RSVP</Link></header><div className="rsvp-layout"><aside className="rsvp-event-panel"><div className="rsvp-event-art"><small>YOU&apos;RE INVITED TO</small><h2>The Lumina<br />Gala</h2><span>CELEBRATE IN FULL COLOUR</span></div><div className="rsvp-event-meta"><p><CalendarDays size={17} /><span><small>DATE & TIME</small><b>24 August · 6:00 PM</b></span></p><p><MapPin size={17} /><span><small>VENUE</small><b>The Monarch, Lagos</b></span></p></div></aside><section className="rsvp-form-panel"><RsvpFlow eventSlug="lumina-gala" /></section></div></main>;
}

