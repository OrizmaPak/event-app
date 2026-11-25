import { notFound } from "next/navigation";
import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { EventPageBuilder } from "@/components/dashboard/EventPageBuilder";
import { nasaClient } from "@/lib/services/nasa-client";

export default async function EventPageDesignRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event) notFound();
  return <><EventManagementHeader event={event} /><EventPageBuilder event={event} initialConfig={event.eventPage} /></>;
}
