import { notFound } from "next/navigation";
import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { InvitationManager } from "@/components/dashboard/InvitationManager";
import { nasaClient } from "@/lib/services/nasa-client";

export default async function DynamicGuestPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const event = await nasaClient.getEvent(slug); if (!event) notFound(); return <><EventManagementHeader event={event} /><InvitationManager eventSlug={event.slug} eventTitle={event.title} /></>; }
