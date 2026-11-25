import { notFound } from "next/navigation";
import { CheckInSetup } from "@/components/dashboard/CheckInSetup";
import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { nasaClient } from "@/lib/services/nasa-client";

export default async function EventCheckInPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event) notFound();
  return <><EventManagementHeader event={event} /><CheckInSetup eventSlug={event.slug} /></>;
}
