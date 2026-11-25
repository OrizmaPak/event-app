import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, Mail, QrCode, UserRoundCheck, UsersRound } from "lucide-react";
import { Donut } from "@/components/dashboard/Charts";
import { EventManagementHeader, ProgressBar } from "@/components/dashboard/DashboardElements";
import { EventOverviewTools } from "@/components/dashboard/EventOverviewTools";
import { nasaClient } from "@/lib/services/nasa-client";

export default async function OrganizerEventOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event) notFound();

  const pending = Math.max(event.capacity - event.confirmed, 0);
  const readiness = event.status === "published" ? Math.min(96, Math.max(68, event.responseRate + 10)) : 44;
  const checkedInPercent = event.confirmed ? Math.round((event.checkedIn / event.confirmed) * 100) : 0;

  return (
    <>
      <EventManagementHeader event={event} />

      <section className="event-overview-lead">
        <div>
          <span className={`event-overview-lead__status event-overview-lead__status--${event.status}`}>{event.status === "published" ? "Published and accepting guests" : "Draft event"}</span>
          <h2>{event.status === "published" ? "Your event is live." : "Finish preparing your event."}</h2>
          <p>{event.status === "published" ? "Monitor responses, communicate with guests, and prepare your event-day team from one place." : "Review the remaining setup items before sharing this event with guests."}</p>
        </div>
        <dl>
          <div><dt>Confirmed</dt><dd>{event.confirmed}</dd></div>
          <div><dt>Available</dt><dd>{pending}</dd></div>
          <div><dt>Checked in</dt><dd>{event.checkedIn}</dd></div>
        </dl>
      </section>

      <EventOverviewTools eventTitle={event.title} url={`/events/${event.slug}`} qrValue={`/events/${event.slug}`} />

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

        <article className="dashboard-panel event-connections-card">
          <div className="panel-heading"><div><small>EVENT CONNECTIONS</small><h2>Keep the event moving</h2></div></div>
          <div className="event-connections-grid">
            <Link href={`/organizer/events/${event.slug}/guests`}><span><UsersRound size={17} /></span><p><b>Guests</b><small>Manage invitations and responses</small></p><ArrowRight size={15} /></Link>
            <Link href={`/organizer/events/${event.slug}/messages`}><span><Mail size={17} /></span><p><b>Messages</b><small>Reach the guest list</small></p><ArrowRight size={15} /></Link>
            <Link href={`/organizer/events/${event.slug}/check-in`}><span><QrCode size={17} /></span><p><b>Check-in</b><small>Prepare event-day access</small></p><ArrowRight size={15} /></Link>
            <Link href={`/organizer/events/${event.slug}/analytics`}><span><UserRoundCheck size={17} /></span><p><b>Analytics</b><small>Track event progress</small></p><ArrowRight size={15} /></Link>
          </div>
        </article>
      </section>
    </>
  );
}
