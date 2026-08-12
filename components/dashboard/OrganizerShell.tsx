"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ContactRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  QrCode,
  Search,
  Settings,
  Sparkles,
  UsersRound,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "@/components/shared/Brand";
import { activity, events } from "@/lib/data/mock-data";

const primary = [
  ["Overview", "/organizer", LayoutDashboard],
  ["Events", "/organizer/events", CalendarDays],
];

const eventLinks = [
  ["Guests", "/organizer/events/lumina-gala/guests", UsersRound],
  ["Seating", "/organizer/events/lumina-gala/seating", ContactRound],
  ["Messages", "/organizer/events/lumina-gala/messages", Mail],
  ["Check-in setup", "/organizer/events/lumina-gala/check-in", QrCode],
  ["Analytics", "/organizer/events/lumina-gala/analytics", BarChart3],
];

const manage = [
  ["Team", "/organizer/team", UsersRound],
  ["Public portfolio", "/organizer/portfolio", Sparkles],
  ["Settings", "/organizer/settings", Settings],
];

const activityIcons = {
  rsvp: UsersRound,
  "check-in": QrCode,
  message: CheckCircle2,
  team: UsersRound,
};

type NavItem = [string, string, React.ComponentType<{ size?: number }>];

export function OrganizerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(events[0].id);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0],
    [selectedEventId],
  );

  useEffect(() => {
    const storedEventId = window.localStorage.getItem("nasa-selected-event");
    if (storedEventId && events.some((event) => event.id === storedEventId)) {
      setSelectedEventId(storedEventId);
    }
  }, []);

  useEffect(() => {
    const [, eventSlug] = pathname.match(/^\/organizer\/events\/([^/]+)/) ?? [];
    if (!eventSlug || eventSlug === "new") return;

    const routeEvent = events.find((event) => event.slug === eventSlug);
    if (!routeEvent || routeEvent.id === selectedEventId) return;

    setSelectedEventId(routeEvent.id);
    window.localStorage.setItem("nasa-selected-event", routeEvent.id);
    window.dispatchEvent(new CustomEvent("nasa-selected-event-change", { detail: routeEvent.id }));
  }, [pathname, selectedEventId]);

  function active(href: string) {
    return href === "/organizer" ? pathname === href : pathname.startsWith(href);
  }

  function logout() {
    window.localStorage.removeItem("nasa-organizer-session");
    window.location.href = "/organizer/login";
  }

  function chooseEvent(eventId: string) {
    setSelectedEventId(eventId);
    setEventMenuOpen(false);
    window.localStorage.setItem("nasa-selected-event", eventId);
    window.dispatchEvent(new CustomEvent("nasa-selected-event-change", { detail: eventId }));
  }

  function compactDate(dateLabel: string) {
    const [, date] = dateLabel.split(", ");
    const [day, month] = date.split(" ");
    return `${day} ${month.slice(0, 3)}`;
  }

  const renderItems = (items: NavItem[]) =>
    items.map(([label, href, Icon]) => (
      <Link
        key={href}
        className={active(href) ? "active" : ""}
        href={href}
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={17} />
        <span>{label}</span>
        {label === "Events" && <em>{events.length}</em>}
      </Link>
    ));

  return (
    <div className="dashboard-app">
      <aside className={`dashboard-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="dashboard-sidebar__brand">
          <Brand inverse />
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <Link className="button button--brand dashboard-create" href="/organizer/events/new">
          <Plus size={16} /> Create new event
        </Link>

        <nav className="dashboard-nav" aria-label="Organizer navigation">
          <small>Workspace</small>
          {renderItems(primary as NavItem[])}

          <div className="event-switcher-wrap">
            <button
              className="event-switcher"
              type="button"
              aria-expanded={eventMenuOpen}
              onClick={() => setEventMenuOpen(!eventMenuOpen)}
            >
              <span className={`event-switcher__dot event-switcher__dot--${selectedEvent.cover}`} />
              <span>
                <small>ACTIVE EVENT</small>
                <b>{selectedEvent.shortTitle}</b>
              </span>
              <ChevronDown size={15} />
            </button>

            {eventMenuOpen && (
              <div className="event-switcher-menu">
                <header>
                  <button type="button" onClick={() => setEventMenuOpen(false)} aria-label="Back to menu">
                    <ArrowLeft size={17} />
                  </button>
                  <span>
                    <small>Switch event</small>
                    <b>Choose the event data to view</b>
                  </span>
                </header>
                {events.map((event) => (
                  <button
                    key={event.id}
                    className={selectedEvent.id === event.id ? "active" : ""}
                    type="button"
                    onClick={() => chooseEvent(event.id)}
                  >
                    <span className={`event-menu-strip event-menu-strip--${event.cover}`} />
                    <p>
                      <b>{event.title}</b>
                      <small>{compactDate(event.dateLabel)} · {event.confirmed}/{event.capacity} confirmed</small>
                    </p>
                    <em>{event.status}</em>
                  </button>
                ))}
              </div>
            )}
          </div>

          {renderItems(eventLinks as NavItem[])}
          <small>Manage</small>
          {renderItems(manage as NavItem[])}
        </nav>

        <div className="dashboard-sidebar__foot">
          <Link href="/check-in/login"><QrCode size={17} /><span>Open check-in app</span></Link>
          <button type="button" onClick={logout}><LogOut size={17} /><span>Sign out</span></button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="dashboard-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>

          <div className="dashboard-search">
            <Search size={17} />
            <button type="button" onClick={() => setSearchOpen(!searchOpen)}>Search events, guests or settings</button>
            <kbd>Ctrl K</kbd>
          </div>

          <div className="dashboard-topbar__actions">
            <div className="notification-menu">
              <button
                className="notification-trigger"
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={18} />
                <i />
              </button>

              {notificationsOpen && (
                <div className="notification-dropdown" role="menu" aria-label="Notifications">
                  <header>
                    <span><Bell size={17} /> Notifications</span>
                    <button type="button" onClick={() => setNotificationsOpen(false)}>Close</button>
                  </header>

                  <button className="notification-item unread" type="button" role="menuitem">
                    <span className="notification-avatar">SA</span>
                    <p>
                      <b>Sam Puldeet Adiyye</b>
                      <small>Confirmed attendance for {selectedEvent.shortTitle} and added a dietary note.</small>
                      <time>2 min ago</time>
                    </p>
                  </button>

                  {activity.map((item) => {
                    const Icon = activityIcons[item.type];
                    return (
                      <button className="notification-item" key={item.id} type="button" role="menuitem">
                        <span className="notification-avatar notification-avatar--mint"><Icon size={17} /></span>
                        <p>
                          <b>{item.title}</b>
                          <small>{item.detail}</small>
                          <time>{item.time}</time>
                        </p>
                      </button>
                    );
                  })}

                  <Link href="/organizer/events/lumina-gala/guests" onClick={() => setNotificationsOpen(false)}>
                    View guest activity
                  </Link>
                </div>
              )}
            </div>

            <div className="profile-menu">
              <button
                className="dashboard-profile profile-trigger"
                type="button"
                aria-label="Account menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              >
                <span>JO</span>
                <div><b>John Oreva</b><small>Workspace owner</small></div>
                <ChevronDown size={15} />
              </button>

              {accountMenuOpen && (
                <div className="profile-dropdown" role="menu" aria-label="Account menu">
                  <header>
                    <span>JO</span>
                    <p><b>John Oreva</b><small>john@nasaevent.demo</small></p>
                  </header>
                  <Link href="/organizer/portfolio" role="menuitem" onClick={() => setAccountMenuOpen(false)}><UserRound size={17} /> Profile</Link>
                  <Link href="/organizer/settings" role="menuitem" onClick={() => setAccountMenuOpen(false)}><Settings size={17} /> Settings</Link>
                  <Link href="/organizer/team" role="menuitem" onClick={() => setAccountMenuOpen(false)}><UsersRound size={17} /> Team access</Link>
                  <Link href="/organizer/events" role="menuitem" onClick={() => setAccountMenuOpen(false)}><CalendarDays size={17} /> My events</Link>
                  <button type="button" role="menuitem" onClick={logout}><LogOut size={17} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {searchOpen && (
          <div className="command-search">
            <Search size={18} />
            <input autoFocus placeholder="Try Amara, seating or Lumina" />
            <kbd>ESC</kbd>
          </div>
        )}

        <main className="dashboard-content">{children}</main>
      </div>

      {mobileOpen && <button className="dashboard-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
