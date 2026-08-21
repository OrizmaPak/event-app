import { notFound } from "next/navigation";
import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { EventPageBuilder } from "@/components/dashboard/EventPageBuilder";
import { events } from "@/lib/data/mock-data";

export default async function EventPageDesignRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = events.find((item) => item.slug === slug);
  if (!event) notFound();
  return <><EventManagementHeader event={event} /><EventPageBuilder event={event} initialConfig={event.eventPage} /></>;
}
