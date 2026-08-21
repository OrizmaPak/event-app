import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventMicrosite } from "@/components/public/EventMicrosite";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import type { EventPageConfig, EventPageSection } from "@/lib/data/types";
import { nasaClient } from "@/lib/services/nasa-client";

const allowedSections = ["faq", "travel", "registry"] as const;

async function getPage(slug: string, sectionName: string) {
  if (!allowedSections.includes(sectionName as (typeof allowedSections)[number])) return null;
  const event = await nasaClient.getEvent(slug);
  if (!event || event.status !== "published" || !event.eventPage) return null;
  const section = event.eventPage.sections.find((item) => item.type === sectionName && item.visible);
  return section ? { event, section } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; section: string }> }): Promise<Metadata> {
  const { slug, section } = await params;
  const page = await getPage(slug, section);
  return page ? { title: `${page.section.title} | ${page.event.title}`, description: page.event.eventPage!.seo.description } : { title: "Event information" };
}

export default async function EventInformationPage({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section: sectionName } = await params;
  const page = await getPage(slug, sectionName);
  if (!page) notFound();
  const { event, section } = page;
  const sourceHero = event.eventPage!.sections.find((item): item is Extract<EventPageSection, { type: "hero" }> => item.type === "hero");
  const hero: EventPageSection = { id: `${section.id}-subhero`, type: "hero", title: section.title, subtitle: `Information for ${event.title}`, visible: true, tone: "dark", countdown: false, media: sourceHero?.media };
  const cta = event.eventPage!.sections.find((item) => item.type === "cta" && item.visible);
  const config: EventPageConfig = { ...event.eventPage!, sections: [hero, section, ...(cta ? [cta] : [])] };
  const platform = config.shell === "platform";
  return <>{platform && <PublicHeader />}<main className={platform ? "public-main" : undefined}><EventMicrosite event={event} config={config} /></main>{platform && <PublicFooter />}</>;
}
