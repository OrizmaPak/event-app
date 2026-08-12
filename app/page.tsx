import Link from "next/link";
import { ArrowRight, CalendarDays, Check, MapPin, QrCode, Sparkles, UsersRound } from "lucide-react";
import { EventCard } from "@/components/public/EventCard";
import { EventPoster } from "@/components/public/EventPoster";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { featuredEvent, featuredOrganizer } from "@/lib/data/mock-data";
import { nasaClient } from "@/lib/services/nasa-client";

export default async function Home() {
  const publishedEvents = await nasaClient.listPublishedEvents();

  return (
    <>
      <PublicHeader transparent fixed />
      <main className="public-main">
        <section className="home-hero">
          <div className="home-hero__inner">
            <div className="home-hero__copy">
              <span className="eyebrow eyebrow--light">The complete event journey</span>
              <h1>Events that feel <em>effortless.</em></h1>
              <p>Create a beautiful event page, collect every RSVP, send personal QR passes and welcome each guest with confidence.</p>
              <div className="home-hero__actions">
                <Link className="button button--brand button--large" href="/organizer/register">Create your first event <ArrowRight size={17} /></Link>
                <Link className="button button--white button--large" href="/events">Explore events</Link>
              </div>
              <div className="home-hero__trust">
                <span className="avatar-stack" aria-hidden="true"><i>AO</i><i>TA</i><i>ZI</i><i>+</i></span>
                <span><b>2,400+</b> joyful check-ins this week</span>
              </div>
            </div>
            <div className="home-hero__visual" aria-label="Sample event invitation and verified guest pass">
              <div className="hero-float-note"><small>RESPONSE RATE</small><b>77%</b></div>
              <div className="hero-ticket">
                <div className="hero-ticket__paper">
                  <div className="hero-ticket__header"><small>YOU&apos;RE INVITED TO</small><b>N</b></div>
                  <div className="hero-ticket__art"><span>Celebrate<br />in full<br />colour</span></div>
                  <div className="hero-ticket__details"><span><small>DATE</small><b>24 AUG · 6:00 PM</b></span><span><small>VENUE</small><b>The Monarch, Lagos</b></span></div>
                  <div className="hero-ticket__pass"><span className="mini-qr-block" aria-hidden="true">{Array.from({ length: 25 }).map((_, index) => <i key={index} />)}</span><span><small>ADMIT</small><b>Amara Okafor · Table 12</b></span></div>
                </div>
              </div>
              <div className="hero-verified"><i><Check size={17} /></i><span><b>Guest verified</b><small>Table 12 · Seat 04</small></span></div>
            </div>
          </div>
        </section>

        <div className="journey-bar" aria-label="NASA EVENT journey">
          <div className="journey-step"><span>01</span><i><Sparkles size={19} /></i><div><b>Create</b><small>A calm, guided setup</small></div></div>
          <div className="journey-step"><span>02</span><i><UsersRound size={19} /></i><div><b>Invite</b><small>Share one beautiful link</small></div></div>
          <div className="journey-step"><span>03</span><i><QrCode size={19} /></i><div><b>Welcome</b><small>Fast, secure guest entry</small></div></div>
        </div>

        <section className="public-section">
          <div className="page-shell">
            <div className="section-heading section-heading--center"><span className="eyebrow">Everything in one place</span><h2>Thoughtful for hosts.<br />Delightful for guests.</h2><p>Every screen is made to feel clear—even if this is your first time organizing an event online.</p></div>
            <div className="feature-grid">
              <article className="feature-card"><span className="feature-card__icon"><Sparkles size={22} /></span><h3>A page people remember</h3><p>Publish a polished event page with your story, date, venue and organizer profile—without needing a designer.</p></article>
              <article className="feature-card"><span className="feature-card__icon"><UsersRound size={22} /></span><h3>A guest list that stays clear</h3><p>See who is attending, who still needs a reminder, dietary notes, plus-ones and seating in one calm view.</p></article>
              <article className="feature-card"><span className="feature-card__icon"><QrCode size={22} /></span><h3>An arrival that simply works</h3><p>Each confirmed guest receives a personal pass. Your door team scans it and immediately sees the right person and seat.</p></article>
            </div>
          </div>
        </section>

        <section className="public-section public-section--paper">
          <div className="page-shell featured-event-layout">
            <div className="featured-event-copy"><span className="eyebrow">Featured this month</span><h2>{featuredEvent.title}</h2><p>{featuredEvent.description}</p><div className="featured-event-meta"><p><CalendarDays size={18} />{featuredEvent.dateLabel} · {featuredEvent.timeLabel}</p><p><MapPin size={18} />{featuredEvent.venue}, {featuredEvent.city}</p></div><Link className="button button--brand button--large" href={`/events/${featuredEvent.slug}`}>View event & RSVP <ArrowRight size={16} /></Link></div>
            <div className="featured-event-art"><EventPoster event={featuredEvent} /></div>
          </div>
        </section>

        <section className="public-section">
          <div className="page-shell">
            <div className="section-heading"><span className="eyebrow">Discover something special</span><h2>Upcoming events</h2><p>Public events created by organizers across the NASA EVENT community.</p></div>
            <div className="event-card-grid">{publishedEvents.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}</div>
            <div style={{ marginTop: 28, textAlign: "center" }}><Link className="button button--outline button--large" href="/events">Explore all events <ArrowRight size={16} /></Link></div>
          </div>
        </section>

        <section className="public-section public-section--paper">
          <div className="page-shell organizer-banner">
            <div><span className="eyebrow eyebrow--light">Featured organizer</span><h2>{featuredOrganizer.name}</h2><p>{featuredOrganizer.tagline} Browse upcoming experiences and see the work behind each gathering.</p><Link className="button button--white button--large" href={`/organizers/${featuredOrganizer.slug}`}>View public portfolio <ArrowRight size={16} /></Link></div>
            <div className="organizer-banner__stats"><div><b>{featuredOrganizer.eventsHosted}</b><span>Events created</span></div><div><b>12.4k</b><span>Guests welcomed</span></div><div><b>{featuredOrganizer.rating}</b><span>Guest rating</span></div></div>
          </div>
        </section>

        <section className="public-section">
          <div className="page-shell cta-panel"><h2>Your next event deserves a calmer beginning.</h2><p>Start with a guided setup and see your event page come to life before you publish.</p><Link className="button button--white button--large" href="/organizer/register">Create a free organizer account <ArrowRight size={17} /></Link></div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
