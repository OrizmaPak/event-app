import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Mail, QrCode, Share2, UserRoundCheck, UsersRound } from "lucide-react";
import { Donut } from "@/components/dashboard/Charts";
import { MockButton, ProgressBar } from "@/components/dashboard/DashboardElements";
import { events, organizers } from "@/lib/data/mock-data";

export default async function OrganizerEventOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = events.find((item) => item.slug === slug);
  if (!event) notFound();

  const organizer = organizers.find((item) => item.id === event.organizerId);
  const pending = Math.max(event.capacity - event.confirmed, 0);
  const readiness = event.status === "published" ? Math.min(96, Math.max(68, event.responseRate + 10)) : 44;
  const checkedInPercent = event.confirmed ? Math.round((event.checkedIn / event.confirmed) * 100) : 0;
  const previewHref = event.status === "published" ? `/events/${event.slug}` : "/organizer/events";

  return (
    <>
      <section className="event-management-head">
        <div className="event-management-head__top">
          <div className={`event-mini-cover event-mini-cover--${event.cover}`}><i /><span>{event.shortTitle}</span></div>
          <div>
            <span className="dashboard-eyebrow">{event.category} · {event.status}</span>
            <h1>{event.title}</h1>
            <p>{event.dateLabel.replace(/^\w+, /, "")} · {event.timeLabel.split(" – ")[0]} · {event.venue}</p>
          </div>
          <div className="event-management-head__actions">
            <Link className="button button--outline button--small" href={previewHref} target="_blank">Preview <ArrowRight size={14} /></Link>
            <MockButton label="Share event" icon={<Share2 size={14} />} />
          </div>
        </div>
      </section>

      <section className="event-summary-grid">
        <article className="event-health-card">
          <div><span className="metric-icon metric-icon--mint"><CheckCircle2 size={18} /></span><p><small>EVENT READINESS</small><b>{event.status === "published" ? "Ready to manage" : "Draft in progress"}</b></p><em>{readiness}%</em></div>
          <ProgressBar value={readiness} tone={event.status === "published" ? "mint" : "gold"} />
          <ul>
            <li className={event.status === "published" ? "done" : ""}><CheckCircle2 size={15} />Event page {event.status === "published" ? "published" : "in draft"}</li>
            <li className={event.responseRate > 60 ? "done" : ""}><CheckCircle2 size={15} />{event.responseRate}% response rate</li>
            <li><Clock3 size={15} />{pending} invitations still available</li>
            <li><Clock3 size={15} />{event.tableCount || "No"} seating tables configured</li>
          </ul>
        </article>

        <article className="dashboard-panel event-response-card">
          <div className="panel-heading"><div><small>RSVP RESPONSE</small><h2>Guest status</h2></div><Link href="/organizer/events">All events <ArrowRight size={14} /></Link></div>
          <div className="event-response-content"><Donut value={event.responseRate} label="responded" /><div className="status-legend"><p><i className="mint" /><span>Confirmed</span><b>{event.confirmed}</b></p><p><i className="gold" /><span>Remaining</span><b>{pending}</b></p><p><i className="coral" /><span>Checked in</span><b>{checkedInPercent}%</b></p></div></div>
        </article>

        <article className="dashboard-panel quick-actions-card">
          <div className="panel-heading"><div><small>QUICK ACTIONS</small><h2>Manage {event.shortTitle}</h2></div></div>
          <div className="event-quick-actions">
            <Link href="/organizer/events"><span><UsersRound size={17} /></span><p><b>Review event list</b><small>Compare this event with the rest of your portfolio</small></p><ArrowRight size={15} /></Link>
            <Link href="/organizer/events/new"><span><CalendarDays size={17} /></span><p><b>Duplicate setup</b><small>Use this event as a starting point for a new one</small></p><ArrowRight size={15} /></Link>
            <Link href="/organizer/team"><span><UserRoundCheck size={17} /></span><p><b>Assign staff</b><small>{organizer?.name ?? "Organizer"} team access</small></p><ArrowRight size={15} /></Link>
            <Link href="/organizer/events/lumina-gala/messages"><span><Mail size={17} /></span><p><b>Open message tools</b><small>Use the sample composer workflow</small></p><ArrowRight size={15} /></Link>
            <Link href="/check-in/login"><span><QrCode size={17} /></span><p><b>Open check-in app</b><small>Preview the event-day staff experience</small></p><ArrowRight size={15} /></Link>
          </div>
        </article>
      </section>
    </>
  );
}
