import type { Metadata } from "next";
import { EventExplorer } from "@/components/public/EventExplorer";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { nasaClient } from "@/lib/services/nasa-client";

export const metadata: Metadata = { title: "Explore events" };

export default async function EventsPage() {
  const events = await nasaClient.listPublishedEvents();
  return <><PublicHeader /><main className="public-main"><section className="page-hero"><div className="page-hero__inner"><span className="eyebrow">Discover what&apos;s happening</span><h1>Find your next unforgettable moment.</h1><p>Explore celebrations, business gatherings, culture and community experiences published by trusted organizers.</p></div></section><section className="public-section"><div className="page-shell"><EventExplorer events={events} /></div></section></main><PublicFooter /></>;
}
