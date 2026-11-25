import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { events } from "@/db/schema";
import { requireCheckInPermission } from "@/lib/auth/event-staff-code";
import { getDatabase } from "@/lib/db/client";
import { CheckInGuard } from "@/components/scanner/CheckInGuard";

export default async function CheckInEventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const principal = await requireCheckInPermission("checkin.operate");
  if (!principal) redirect("/check-in/events");
  if (principal.eventScope !== "all" && principal.eventScope !== slug) notFound();
  const [event] = await getDatabase().select({ id: events.id }).from(events).where(and(eq(events.slug, slug), eq(events.organizerId, principal.organizerId), eq(events.status, "published"))).limit(1);
  if (!event) notFound();
  return <CheckInGuard eventSlug={slug}>{children}</CheckInGuard>;
}
