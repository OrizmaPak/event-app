import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { events } from "@/db/schema";
import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { EventAnalytics } from "@/components/dashboard/EventAnalytics";
import { requirePermission, hasPermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { nasaClient } from "@/lib/services/nasa-client";
import { loadEventAnalytics, loadEventRevenue } from "@/lib/server/event-analytics";

export default async function EventAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const principal = await requirePermission("analytics.view");
  if (!principal || (principal.eventScope !== "all" && principal.eventScope !== slug)) notFound();
  const [record] = await getDatabase().select().from(events).where(and(eq(events.slug, slug), eq(events.organizerId, principal.organizerId))).limit(1);
  if (!record) notFound();
  const canViewFinance = hasPermission(principal, "finance.view");
  const [event, data, revenue] = await Promise.all([
    nasaClient.getEvent(slug), loadEventAnalytics(record), canViewFinance ? loadEventRevenue([record.id]) : Promise.resolve([]),
  ]);
  if (!event) notFound();
  if (!canViewFinance) {
    data.summary.collectedMinor = 0;
    data.summary.checkedInValueMinor = 0;
    data.summary.confirmedTicketValueMinor = 0;
    data.summary.totalValueMinor = 0;
    data.summary.availableValueMinor = 0;
    data.daily.forEach((point) => { point.revenueMinor = 0; });
    data.bands.forEach((band) => { band.revenueMinor = 0; });
  }
  return <><EventManagementHeader event={event} /><EventAnalytics data={data} currency={record.currency} admissionMode={record.admissionMode} timezone={record.timezone} canViewFinance={canViewFinance} refundedMinor={revenue.reduce((sum, item) => sum + item.refundedMinor, 0)} /></>;
}
