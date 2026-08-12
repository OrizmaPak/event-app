import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardElements";
import { OrganizerEventsList } from "@/components/dashboard/OrganizerEventsList";
import { events } from "@/lib/data/mock-data";
export default function OrganizerEventsPage() { return <><PageHeader eyebrow="Your portfolio" title="Events" description="Create, publish and manage every experience from one place." actions={<Link className="button button--brand" href="/organizer/events/new"><Plus size={16} /> Create event</Link>} /><OrganizerEventsList events={events} /></>; }
