import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventMicrosite } from "@/components/public/EventMicrosite";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { nasaClient } from "@/lib/services/nasa-client";
import { hasEventPageAccess } from "@/lib/server/public-event-access";
import { PrivateEventGate } from "@/components/public/PrivateEventGate";
import { getCurrentUser } from "@/lib/auth/session";
import { and, eq, or } from "drizzle-orm";
import { organizerMembers, organizers } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  const page = event?.eventPage;
  if (event?.visibility === "private") return { title: event.title, description: "Private event. Invitation required." };
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
  if (!await hasEventPageAccess(event)) return <PrivateEventGate slug={event.slug} title={event.title} />;
  const platform = event.eventPage.shell === "platform";
  const current = platform ? await getCurrentUser() : null;
  const publicUser = current ? { firstName: current.user.firstName, lastName: current.user.lastName, email: current.user.email } : null;
  const [membership] = current ? await getDatabase().select({ organizerId: organizerMembers.organizerId }).from(organizerMembers).innerJoin(organizers, eq(organizers.id, organizerMembers.organizerId)).where(and(eq(organizerMembers.userId, current.user.id), eq(organizerMembers.organizerId, event.organizerId), eq(organizerMembers.status, "active"), eq(organizers.status, "active"), or(eq(organizerMembers.eventScope, "all"), eq(organizerMembers.eventScope, event.slug)))).limit(1) : [];
  const workspaceHref = membership ? `/organizer/events/${event.slug}` : null;
  return <>{platform && <PublicHeader user={publicUser} workspaceHref={workspaceHref} />}<main className={platform ? "public-main" : undefined}><EventMicrosite event={event} /></main>{platform && <PublicFooter />}</>;
}
