import { notFound } from "next/navigation";
import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { MessageComposer } from "@/components/dashboard/MessageComposer";
import { nasaClient } from "@/lib/services/nasa-client";

export default async function EventMessagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event) notFound();
  const guests = await nasaClient.listGuests(event.id);
  return <><EventManagementHeader event={event} /><MessageComposer event={event} guests={guests} /></>;
}
