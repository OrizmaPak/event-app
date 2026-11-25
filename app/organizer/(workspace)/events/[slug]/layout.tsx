import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { events } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const principal = await requirePermission("events.view");
  const { slug } = await params;
  if (!principal || (principal.eventScope !== "all" && principal.eventScope !== slug)) notFound();
  const [event] = await getDatabase().select({ id: events.id }).from(events).where(and(eq(events.slug, slug), eq(events.organizerId, principal.organizerId))).limit(1);
  if (!event) notFound();
  return children;
}
