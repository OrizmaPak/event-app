import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardElements";
import { OrganizerEventsList } from "@/components/dashboard/OrganizerEventsList";
import { getWorkspacePrincipal, hasPermission } from "@/lib/auth/policy";
import { listDatabaseOrganizerEvents } from "@/lib/db/events";
import { loadEventRevenue } from "@/lib/server/event-analytics";

export default async function OrganizerEventsPage() {
  const principal = await getWorkspacePrincipal();
  const events = principal ? (await listDatabaseOrganizerEvents(principal.organizerId)).filter((event) => principal.eventScope === "all" || principal.eventScope === event.slug) : [];
  const revenue = principal && hasPermission(principal, "finance.view") ? await loadEventRevenue(events.map((event) => event.id)) : undefined;
  return <main className="organizer-events-page"><section className="organizer-events-hero"><PageHeader eyebrow="Your portfolio" title="Events" description="Create, publish and manage every experience from one place." actions={principal && hasPermission(principal, "events.create") ? <Link className="button button--brand" href="/organizer/events/new"><Plus size={16} /> Create event</Link> : undefined} /></section><OrganizerEventsList events={events} revenue={revenue} /></main>;
}
