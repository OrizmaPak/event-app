import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventMicrosite } from "@/components/public/EventMicrosite";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import type { EventPageConfig, EventPageSection } from "@/lib/data/types";
import { nasaClient } from "@/lib/services/nasa-client";
import { hasEventPageAccess } from "@/lib/server/public-event-access";
import { PrivateEventGate } from "@/components/public/PrivateEventGate";
import { getCurrentUser } from "@/lib/auth/session";
import { and, eq, or } from "drizzle-orm";
import { organizerMembers, organizers } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";

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
  if (page?.event.visibility === "private") return { title: page.event.title, description: "Private event. Invitation required." };
  return page ? { title: `${page.section.title} | ${page.event.title}`, description: page.event.eventPage!.seo.description } : { title: "Event information" };
}

export default async function EventInformationPage({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section: sectionName } = await params;
  const page = await getPage(slug, sectionName);
  if (!page) notFound();
  const { event, section } = page;
  if (!await hasEventPageAccess(event)) return <PrivateEventGate slug={event.slug} title={event.title} />;
  const sourceHero = event.eventPage!.sections.find((item): item is Extract<EventPageSection, { type: "hero" }> => item.type === "hero");
  const hero: EventPageSection = { id: `${section.id}-subhero`, type: "hero", title: section.title, subtitle: `Information for ${event.title}`, visible: true, tone: "dark", countdown: false, media: sourceHero?.media };
  const cta = event.eventPage!.sections.find((item) => item.type === "cta" && item.visible);
  const config: EventPageConfig = { ...event.eventPage!, sections: [hero, section, ...(cta ? [cta] : [])] };
  const platform = config.shell === "platform";
  const current = platform ? await getCurrentUser() : null;
  const publicUser = current ? { firstName: current.user.firstName, lastName: current.user.lastName, email: current.user.email } : null;
  const [membership] = current ? await getDatabase().select({ organizerId: organizerMembers.organizerId }).from(organizerMembers).innerJoin(organizers, eq(organizers.id, organizerMembers.organizerId)).where(and(eq(organizerMembers.userId, current.user.id), eq(organizerMembers.organizerId, event.organizerId), eq(organizerMembers.status, "active"), eq(organizers.status, "active"), or(eq(organizerMembers.eventScope, "all"), eq(organizerMembers.eventScope, event.slug)))).limit(1) : [];
  const workspaceHref = membership ? `/organizer/events/${event.slug}` : null;
  return <>{platform && <PublicHeader user={publicUser} workspaceHref={workspaceHref} />}<main className={platform ? "public-main" : undefined}><EventMicrosite event={event} config={config} /></main>{platform && <PublicFooter />}</>;
}
