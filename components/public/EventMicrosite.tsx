"use client";

import Link from "next/link";
import { CalendarPlus, ChevronDown, Clock3, ExternalLink, Gift, Hotel, MapPin, Menu, Navigation, ParkingCircle, Plane, Ticket, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { EventPageConfig, EventPageSection, EventRecord, GiftMethod } from "@/lib/data/types";

function actionHref(event: EventRecord, config: EventPageConfig) {
  return config.primaryAction.type === "external" && config.primaryAction.url ? config.primaryAction.url : `/events/${event.slug}/rsvp`;
}

function sectionHref(event: EventRecord, section: EventPageSection, preview: boolean) {
  if (preview) return `#${section.id}`;
  if (section.type === "faq" || section.type === "travel" || section.type === "registry") return `/events/${event.slug}/${section.type}`;
  return `#${section.id}`;
}

function calendarHref(item: Extract<EventPageSection, { type: "schedule" }>["items"][number]) {
  const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title,
    dates: `${stamp(item.startISO)}/${stamp(item.endISO)}`,
    details: item.description,
    location: `${item.venue}, ${item.address}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const distance = new Date(target).getTime() - now;
  if (distance <= -86_400_000) return <p className="event-countdown__complete">This event has taken place.</p>;
  if (distance <= 0) return <p className="event-countdown__complete">Today is the day.</p>;
  const values = [
    [Math.floor(distance / 86_400_000), "days"],
    [Math.floor((distance / 3_600_000) % 24), "hours"],
    [Math.floor((distance / 60_000) % 60), "minutes"],
    [Math.floor((distance / 1000) % 60), "seconds"],
  ] as const;
  return <div className="event-countdown" aria-label="Time until event">{values.map(([value, label]) => <div key={label}><b>{String(value).padStart(2, "0")}</b><span>{label}</span></div>)}</div>;
}

function GiftMethodCard({ method }: { method: GiftMethod }) {
  const [revealed, setRevealed] = useState(false);
  if (method.type === "link") return <article className="event-gift-card"><span><Gift size={20} /></span><div><h3>{method.label}</h3>{method.description && <p>{method.description}</p>}<a className="event-text-link" href={method.url} target="_blank" rel="noreferrer">Open gift link <ExternalLink size={14} /></a></div></article>;
  const masked = method.accountNumber ? `••••••${method.accountNumber.slice(-4)}` : "Not provided";
  return <article className="event-gift-card"><span><Gift size={20} /></span><div><h3>{method.label}</h3>{method.description && <p>{method.description}</p>}<dl><div><dt>Bank</dt><dd>{method.bankName}</dd></div><div><dt>Account name</dt><dd>{method.accountName}</dd></div><div><dt>Account number</dt><dd>{revealed ? method.accountNumber : masked}</dd></div><div><dt>Currency</dt><dd>{method.currency}</dd></div></dl><button className="event-text-link" type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? "Hide details" : "Reveal details"}</button></div></article>;
}

function GallerySection({ section }: { section: Extract<EventPageSection, { type: "gallery" }> }) {
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    if (active === null) return;
    function close(event: KeyboardEvent) { if (event.key === "Escape") setActive(null); }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [active]);
  return <>
    <div className="event-gallery-grid">{section.media.map((media, index) => <button type="button" key={media.id} onClick={() => setActive(index)} aria-label={`Open ${media.alt}`}><img src={media.src} alt={media.alt} /></button>)}</div>
    {active !== null && <div className="event-lightbox" role="dialog" aria-modal="true" aria-label="Gallery image"><button type="button" onClick={() => setActive(null)} aria-label="Close gallery"><X size={22} /></button><img src={section.media[active].src} alt={section.media[active].alt} /><p>{section.media[active].caption ?? section.media[active].alt}</p></div>}
  </>;
}

function AccessGate({ event, config, children }: { event: EventRecord; config: EventPageConfig; children: React.ReactNode }) {
  const isPrivate = config.access.mode !== "public" || event.visibility === "private";
  const [status, setStatus] = useState<"checking" | "locked" | "allowed">(isPrivate ? "checking" : "allowed");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<{ guestName: string; partyAllowance: number; personalization: Record<string, unknown> } | null>(null);

  useEffect(() => {
    if (!isPrivate) return;
    let active = true;
    fetch(`/api/events/${event.slug}/access`, { credentials: "include" }).then(async (response) => {
      const payload: any = await response.json();
      if (!active) return;
      if (response.ok && payload.data?.allowed) { setProfile(payload.data.invitation ?? null); setStatus("allowed"); }
      else setStatus("locked");
    }).catch(() => { if (active) setStatus("locked"); });
    return () => { active = false; };
  }, [event.slug, isPrivate]);

  async function unlock(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    setError("");
    const response = await fetch(`/api/events/${event.slug}/access`, { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ email, code }) }).catch(() => null);
    if (!response) { setError("The invitation service is unavailable. Please try again."); return; }
    const payload: any = await response.json();
    if (!response.ok) { setError(payload.error?.message ?? "We could not verify those invitation details."); return; }
    setProfile(payload.data.invitation);
    setStatus("allowed");
  }

  if (status === "checking") return <main className="event-access event-access--checking" style={{ "--event-accent": config.branding.accent, "--event-bg": config.branding.background, "--event-text": config.branding.text } as React.CSSProperties}><div><span className="event-access__logo">{config.branding.logoText}</span><p>Checking your invitation…</p></div></main>;
  if (status === "allowed") return <>{profile && <aside className="event-personal-welcome" style={{ "--event-accent": config.branding.accent } as React.CSSProperties}><div><small>YOUR INVITATION</small><b>Welcome, {profile.guestName}.</b><span>{String(profile.personalization.hostNote ?? `We have reserved ${profile.partyAllowance} place${profile.partyAllowance === 1 ? "" : "s"} for you.`)}</span></div><em>{profile.partyAllowance} {profile.partyAllowance === 1 ? "place" : "places"}</em></aside>}{children}</>;
  return <main className="event-access" style={{ "--event-accent": config.branding.accent, "--event-bg": config.branding.background, "--event-text": config.branding.text } as React.CSSProperties}><form onSubmit={unlock}><span className="event-access__logo">{config.branding.logoText}</span><small>{config.access.mode === "private-listed" ? "LISTED PRIVATE EVENT" : "PRIVATE INVITATION"}</small><h1>You&apos;re invited.</h1><p>This event page is reserved for named guests. Enter the email and unique invitation code sent by the host.</p><label><span>Guest email</span><input type="email" required value={email} onChange={(changeEvent) => { setEmail(changeEvent.target.value); setError(""); }} placeholder="you@example.com" autoComplete="email" /></label><label><span>Invitation code</span><input required value={code} onChange={(changeEvent) => { setCode(changeEvent.target.value.toUpperCase()); setError(""); }} placeholder="XXXX-XXXX-XXXX" autoComplete="one-time-code" /></label>{error && <p className="event-access__error" role="alert">{error}</p>}{config.access.hint && <p className="event-access__hint">{config.access.hint}</p>}<button type="submit">Open my invitation</button><em>Demo invitation: amara.private@example.com · AZ-AMAR-2026</em></form></main>;
}

function SectionHeading({ section }: { section: EventPageSection }) {
  return <header className="event-section-heading">{section.eyebrow && <span>{section.eyebrow}</span>}<h2>{section.title}</h2></header>;
}

export function EventMicrosite({ event, config = event.eventPage!, preview = false, skipAccess = false }: { event: EventRecord; config?: EventPageConfig; preview?: boolean; skipAccess?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleSections = useMemo(() => config.sections.filter((section) => section.visible), [config.sections]);
  const hero = visibleSections.find((section): section is Extract<EventPageSection, { type: "hero" }> => section.type === "hero");
  const sections = visibleSections.filter((section) => section.type !== "hero");
  const scheduleStart = visibleSections.find((section): section is Extract<EventPageSection, { type: "schedule" }> => section.type === "schedule")?.items[0]?.startISO ?? event.dateISO;
  const href = actionHref(event, config);
  const external = config.primaryAction.type === "external";
  const style = {
    "--event-accent": config.branding.accent,
    "--event-bg": config.branding.background,
    "--event-surface": config.branding.surface,
    "--event-text": config.branding.text,
  } as React.CSSProperties;

  const content = <article className={`event-microsite event-microsite--${config.template} event-microsite--${config.branding.typography}${preview ? " event-microsite--preview" : ""}`} style={style}>
    {config.shell === "microsite" && <header className="event-site-nav"><Link href={`/events/${event.slug}`} className="event-site-logo">{config.branding.logoText}</Link><nav aria-label="Event page navigation">{sections.slice(0, 6).map((section) => <Link key={section.id} href={sectionHref(event, section, preview)}>{section.type === "people" ? "Guests" : section.type}</Link>)}</nav><a className="event-site-nav__action" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{config.primaryAction.label}</a><button type="button" aria-label="Toggle event navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>{menuOpen && <div className="event-site-mobile-nav">{sections.map((section) => <Link onClick={() => setMenuOpen(false)} key={section.id} href={sectionHref(event, section, preview)}>{section.title}</Link>)}<a href={href}>{config.primaryAction.label}</a></div>}</header>}

    {hero && <section id={hero.id} className="event-page-hero" style={hero.media ? { backgroundImage: `linear-gradient(90deg, rgba(8,8,10,.72), rgba(8,8,10,.15)), url(${hero.media.src})` } : undefined}><div><span>{event.eyebrow}</span><h1>{hero.title}</h1><p>{hero.subtitle}</p>{hero.countdown && <Countdown target={scheduleStart} />}<a className="event-primary-action" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}><Ticket size={18} />{config.primaryAction.label}{external && <ExternalLink size={15} />}</a></div></section>}

    <nav className="event-sticky-nav" aria-label="On this event page">{sections.slice(0, 7).map((section) => <Link key={section.id} href={sectionHref(event, section, preview)}>{section.type}</Link>)}</nav>

    {sections.map((section) => <section key={section.id} id={section.id} className={`event-content-section event-content-section--${section.type} event-content-section--${section.tone ?? "light"}`}>
      <div className="event-content-inner">
        {section.type !== "cta" && <SectionHeading section={section} />}
        {section.type === "story" && <div className="event-story-content"><div>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.quote && <blockquote>{section.quote}</blockquote>}</div>{section.media && <img src={section.media.src} alt={section.media.alt} />}</div>}
        {section.type === "schedule" && <div className="event-schedule-list">{section.items.map((item) => <article key={item.id}><time dateTime={item.startISO}><b>{new Intl.DateTimeFormat("en-NG", { day: "2-digit" }).format(new Date(item.startISO))}</b><span>{new Intl.DateTimeFormat("en-NG", { month: "short", year: "numeric" }).format(new Date(item.startISO))}</span></time><div><small>{item.subtitle}</small><h3>{item.title}</h3><p>{item.description}</p><dl><div><Clock3 size={16} /><span>{new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(new Date(item.startISO))} – {new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(new Date(item.endISO))}</span></div><div><MapPin size={16} /><span><b>{item.venue}</b>{item.address}</span></div></dl><div className="event-inline-actions"><a href={calendarHref(item)} target="_blank" rel="noreferrer"><CalendarPlus size={15} /> Add to calendar</a>{item.directionsUrl && <a href={item.directionsUrl} target="_blank" rel="noreferrer"><Navigation size={15} /> Directions</a>}</div></div></article>)}</div>}
        {section.type === "people" && <>{section.intro && <p className="event-section-intro">{section.intro}</p>}<div className="event-people-grid">{section.people.map((person) => <article key={person.id}>{person.image ? <img src={person.image.src} alt={person.image.alt} /> : <span>{person.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span>}<h3>{person.name}</h3><b>{person.role}</b>{person.bio && <p>{person.bio}</p>}</article>)}</div></>}
        {section.type === "highlights" && <div className="event-highlights-grid">{section.items.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>}
        {section.type === "venue" && <><p className="event-section-intro">{section.description}</p><div className="event-venue-grid">{section.venues.map((venue) => <article key={venue.id}><MapPin size={22} /><h3>{venue.name}</h3><p>{venue.address}</p>{venue.directionsUrl && <a className="event-text-link" href={venue.directionsUrl} target="_blank" rel="noreferrer">Get directions <ExternalLink size={13} /></a>}</article>)}</div></>}
        {section.type === "travel" && <><p className="event-section-intro">{section.intro}</p><div className="event-travel-grid">{section.items.slice(0, preview ? 3 : undefined).map((item) => { const Icon = item.category === "hotel" ? Hotel : item.category === "transport" ? Plane : item.category === "parking" ? ParkingCircle : MapPin; return <article key={item.id}><Icon size={21} /><h3>{item.title}</h3><p>{item.description}</p>{item.url && <a className="event-text-link" href={item.url} target="_blank" rel="noreferrer">View recommendation <ExternalLink size={13} /></a>}</article>; })}</div>{!preview && <Link className="event-secondary-link" href={`/events/${event.slug}/travel`}>View complete travel guide</Link>}</>}
        {section.type === "gallery" && <GallerySection section={section} />}
        {section.type === "sponsors" && <>{section.intro && <p className="event-section-intro">{section.intro}</p>}<div className="event-sponsor-row">{section.names.map((name) => <span key={name}>{name}</span>)}</div></>}
        {section.type === "registry" && <><p className="event-section-intro">{section.intro}</p><div className="event-gift-grid">{section.methods.map((method) => <GiftMethodCard key={method.id} method={method} />)}</div>{!preview && <Link className="event-secondary-link" href={`/events/${event.slug}/registry`}>Open registry details</Link>}</>}
        {section.type === "faq" && <><p className="event-section-intro">{section.intro}</p><div className="event-faq-list">{section.items.slice(0, preview ? 3 : undefined).map((item) => <details key={item.id}><summary>{item.question}<ChevronDown size={18} /></summary><p>{item.answer}</p></details>)}</div>{!preview && <Link className="event-secondary-link" href={`/events/${event.slug}/faq`}>View all questions</Link>}</>}
        {section.type === "contact" && <div className="event-contact-block"><p>{section.body}</p>{section.email && <a href={`mailto:${section.email}`}>{section.email}</a>}{section.phone && <a href={`tel:${section.phone.replace(/\s/g, "")}`}>{section.phone}</a>}</div>}
        {section.type === "cta" && <div className="event-final-cta"><span>{config.branding.logoText}</span><h2>{section.title}</h2><p>{section.body}</p><a className="event-primary-action" href={href}>{section.buttonLabel}</a></div>}
      </div>
    </section>)}

    {config.shell === "microsite" && <footer className="event-site-footer"><b>{config.branding.logoText}</b><span>{event.dateLabel} · {event.city}</span><Link href="/">Created with NASA EVENT</Link></footer>}
  </article>;

  return skipAccess ? content : <AccessGate event={event} config={config}>{content}</AccessGate>;
}
