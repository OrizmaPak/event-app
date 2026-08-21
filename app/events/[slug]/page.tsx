import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventMicrosite } from "@/components/public/EventMicrosite";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { nasaClient } from "@/lib/services/nasa-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  const page = event?.eventPage;
  if (!event || !page) return { title: event?.title ?? "Event" };
  return {
    title: page.seo.title,
    description: page.seo.description,
    openGraph: { title: page.seo.title, description: page.seo.description, images: page.seo.image ? [{ url: page.seo.image }] : [] },
    twitter: { card: "summary_large_image", title: page.seo.title, description: page.seo.description, images: page.seo.image ? [page.seo.image] : [] },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event || event.status !== "published" || !event.eventPage) notFound();
  const platform = event.eventPage.shell === "platform";
  return <>{platform && <PublicHeader />}<main className={platform ? "public-main" : undefined}><EventMicrosite event={event} /></main>{platform && <PublicFooter />}</>;
}
