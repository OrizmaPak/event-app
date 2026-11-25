import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Plus, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardElements";
import { getWorkspacePrincipal } from "@/lib/auth/policy";
import { listDatabaseOrganizerEvents } from "@/lib/db/events";

export default async function OrganizerDashboardPage() {
  const principal = await getWorkspacePrincipal();
  if (!principal) redirect("/organizer/login");
  const events = (await listDatabaseOrganizerEvents(principal.organizerId)).filter((event) => principal.eventScope === "all" || principal.eventScope === event.slug);
  const confirmed = events.reduce((sum, event) => sum + event.confirmed, 0);
  const checkedIn = events.reduce((sum, event) => sum + event.checkedIn, 0);
  const capacity = events.reduce((sum, event) => sum + event.capacity, 0);
  const capacityUsed = capacity ? Math.round((confirmed / capacity) * 100) : 0;
  return <><PageHeader eyebrow="YOUR WORKSPACE" title={`Welcome, ${principal.name}`} description="Manage your events and attendees." actions={principal.permissions.has("*") || principal.permissions.has("events.create") ? <Link className="button button--brand" href="/organizer/events/new"><Plus size={16} /> Create event</Link> : undefined} />
    <section className="metric-grid"><article><small>EVENTS</small><h2>{events.length}</h2></article><article><small>PUBLISHED</small><h2>{events.filter((event) => event.status === "published").length}</h2></article><article><small>CONFIRMED ATTENDEES</small><h2>{confirmed}</h2></article><article><small>CHECKED IN</small><h2>{checkedIn}</h2></article></section>
    <section className="workspace-insights">
      <article className="dashboard-panel workspace-response-chart"><header className="panel-heading"><div><small>PORTFOLIO PERFORMANCE</small><h2>Guest response rate</h2></div><BarChart3 size={19} /></header>{events.length ? <div className="workspace-bars" aria-label="Guest response rate by event">{events.slice(0, 6).map((event) => <div key={event.id}><span><i style={{ height: `${Math.max(event.responseRate, 5)}%` }} /></span><b>{event.responseRate}%</b><small>{event.shortTitle}</small></div>)}</div> : <p className="workspace-empty-chart">Create an event to start seeing response data here.</p>}</article>
      <article className="dashboard-panel workspace-capacity-card"><header className="panel-heading"><div><small>ATTENDEE CAPACITY</small><h2>Places filled</h2></div><UsersRound size={19} /></header><div className="workspace-capacity"><div style={{ background: `conic-gradient(var(--brand) 0 ${capacityUsed}%, var(--paper-2) ${capacityUsed}% 100%)` }}><span><b>{capacityUsed}%</b><small>filled</small></span></div><p><b>{confirmed.toLocaleString()} of {capacity.toLocaleString()}</b><small>Confirmed places across all events</small></p></div></article>
    </section>
    <section className="workspace-events-panel dashboard-panel"><header className="panel-heading"><div><small>YOUR PORTFOLIO</small><h2>Your events</h2></div><Link href="/organizer/events">View all <ArrowRight size={14} /></Link></header>{!events.length ? <p className="workspace-events-empty">No events yet. Create your first event to start building your portfolio.</p> : <div className="workspace-events-list">{events.slice(0, 6).map((event) => <Link href={`/organizer/events/${event.slug}`} key={event.id}><span className={`workspace-event-mark workspace-event-mark--${event.cover}`}><i /></span><span><b>{event.title}</b><small>{event.dateLabel} · {event.venue}</small></span><em className={event.status === "published" ? "published" : "draft"}>{event.status === "published" ? "Published" : "Draft"}</em><strong>{event.confirmed} <small>confirmed</small></strong><ArrowRight size={16} /></Link>)}</div>}</section></>;
}
