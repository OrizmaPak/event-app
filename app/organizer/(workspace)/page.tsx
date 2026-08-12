import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Plus, QrCode, TrendingUp, UsersRound } from "lucide-react";
import { Donut, ResponseAreaChart } from "@/components/dashboard/Charts";
import { EventSelector, PageHeader, ProgressBar } from "@/components/dashboard/DashboardElements";
import { activity, events } from "@/lib/data/mock-data";

const activityIcons = { rsvp: UsersRound, "check-in": QrCode, message: CheckCircle2, team: UsersRound };

export default function OrganizerDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tuesday, 12 August"
        title="Good morning, John"
        description="Here is how your events are coming together."
        actions={<><EventSelector /><Link className="button button--brand" href="/organizer/events/new"><Plus size={16} /> Create event</Link></>}
      />

      <section className="metric-grid">
        <article><span className="metric-icon metric-icon--violet"><CalendarDays size={19} /></span><small>ACTIVE EVENTS</small><h2>03</h2><p className="metric-up"><TrendingUp size={13} /> 1 new this month</p></article>
        <article><span className="metric-icon metric-icon--coral"><UsersRound size={19} /></span><small>TOTAL GUESTS</small><h2>1,248</h2><p className="metric-up"><TrendingUp size={13} /> 18.4% this week</p></article>
        <article><span className="metric-icon metric-icon--mint"><CheckCircle2 size={19} /></span><small>CONFIRMED</small><h2>872</h2><p>69.8% response rate</p></article>
        <article><span className="metric-icon metric-icon--gold"><QrCode size={19} /></span><small>CHECKED IN</small><h2>486</h2><p>55.7% of confirmed</p></article>
      </section>

      <section className="dashboard-grid dashboard-grid--charts">
        <article className="dashboard-panel dashboard-panel--wide">
          <div className="panel-heading"><div><small>LIVE OVERVIEW</small><h2>Guest responses</h2></div><select aria-label="Response chart time range"><option>Last 7 days</option><option>Last 30 days</option></select></div>
          <ResponseAreaChart />
        </article>
        <article className="dashboard-panel">
          <div className="panel-heading"><div><small>RESPONSE RATE</small><h2>RSVP status</h2></div></div>
          <Donut value={72} label="responded" />
          <div className="status-legend"><p><i className="mint" /><span>Confirmed</span><b>872</b></p><p><i className="gold" /><span>Pending</span><b>261</b></p><p><i className="coral" /><span>Declined</span><b>115</b></p></div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--lower">
        <article className="dashboard-panel">
          <div className="panel-heading"><div><small>UPCOMING</small><h2>Your events</h2></div><Link href="/organizer/events">View all <ArrowRight size={14} /></Link></div>
          <div className="dashboard-event-list">
            {events.slice(0, 3).map((event) => (
              <Link href={`/organizer/events/${event.slug}`} key={event.id}>
                <span className={`date-tile date-tile--${event.cover}`}><b>{event.dateLabel.split(", ")[1].split(" ")[0]}</b><small>{event.dateLabel.split(" ")[2].slice(0, 3).toUpperCase()}</small></span>
                <span className="event-row-copy"><b>{event.title}</b><small>{event.timeLabel.split(" - ")[0]} · {event.venue}</small></span>
                <span className="event-row-progress"><b>{event.confirmed} / {event.capacity} guests</b><ProgressBar value={Math.round(event.confirmed / event.capacity * 100)} /></span>
                <em className={`pill ${event.status === "published" ? "pill--success" : "pill--warning"}`}>{event.status}</em>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-heading"><div><small>LATEST</small><h2>Recent activity</h2></div><button type="button">...</button></div>
          <div className="activity-list">
            {activity.map((item) => {
              const Icon = activityIcons[item.type];
              return <div key={item.id}><span><Icon size={15} /></span><p><b>{item.title}</b><small>{item.detail}</small></p><time>{item.time}</time></div>;
            })}
          </div>
        </article>
      </section>
    </>
  );
}
