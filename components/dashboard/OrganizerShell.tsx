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
  Landmark,
  Menu,
  Paintbrush,
  Plus,
  QrCode,
  Search,
  Settings,
  Store,
  Sparkles,
  Ticket,
  UsersRound,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "@/components/shared/Brand";
import { activity } from "@/lib/data/mock-data";
import type { EventRecord } from "@/lib/data/types";
import { OrganizerPermissionsProvider } from "@/components/dashboard/OrganizerPermissionsContext";

const primary = [
  ["Overview", "/organizer", LayoutDashboard, "workspace.view"],
  ["Events", "/organizer/events", CalendarDays, "events.view"],
  ["Resources", "/organizer/resources", Store, "resources.view"],
];

const manage = [
  ["Finance & refunds", "/organizer/finance", Landmark, "finance.view"],
  ["Team", "/organizer/team", UsersRound, "team.view"],
  ["Public portfolio", "/organizer/portfolio", Sparkles, "workspace.manage"],
  ["Settings", "/organizer/settings", Settings, "workspace.manage"],
];

const activityIcons = {
  rsvp: UsersRound,
  "check-in": QrCode,
  message: CheckCircle2,
  team: UsersRound,
};

type NavItem = [string, string, React.ComponentType<{ size?: number }>, string];

export function OrganizerShell({ children, principal, events }: { children: React.ReactNode; principal: { name: string; email: string; role: string; permissions: string[] }; events: EventRecord[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[0]?.id ?? null);
  const [serverNotifications, setServerNotifications] = useState<Array<{ id: string; title: string; body: string; createdAt: string; readAt?: string | null }>>([]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0] ?? null,
    [selectedEventId],
  );
  const can = (permission: string) => principal.permissions.includes("*") || principal.permissions.includes(permission);
  const eventLinks: NavItem[] = selectedEvent ? [
    ["Overview", `/organizer/events/${selectedEvent.slug}`, LayoutDashboard, "events.view"],
    ["Page design", `/organizer/events/${selectedEvent.slug}/page-design`, Paintbrush, "page.manage"],
    ["Bookings", `/organizer/events/${selectedEvent.slug}/bookings`, Ticket, "tickets.manage"],
    ["Guests", `/organizer/events/${selectedEvent.slug}/guests`, UsersRound, "guests.view"],
    ["Seating", `/organizer/events/${selectedEvent.slug}/seating`, ContactRound, "seating.manage"],
    ["Messages", `/organizer/events/${selectedEvent.slug}/messages`, Mail, "messages.manage"],
    ["Check-in setup", `/organizer/events/${selectedEvent.slug}/check-in`, QrCode, "checkin.operate"],
    ["Analytics", `/organizer/events/${selectedEvent.slug}/analytics`, BarChart3, "analytics.view"],
  ] : [];

  useEffect(() => {
    const storedEventId = window.localStorage.getItem("nasa-selected-event");
    if (storedEventId && events.some((event) => event.id === storedEventId)) {
      setSelectedEventId(storedEventId);
    }
  }, []);

  useEffect(() => {
    fetch("/api/organizer/notifications").then((response) => response.ok ? response.json() : null).then((payload: any) => { if (payload?.data) setServerNotifications(payload.data); }).catch(() => undefined);
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
    void fetch("/api/v1/auth/logout", { method: "POST" }).finally(() => { window.location.href = "/organizer/login"; });
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
    items.filter(([, , , permission]) => can(permission) || (permission === "resources.view" && can("resources.manage"))).map(([label, href, Icon]) => (
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

        {can("events.create") && <Link className="button button--brand dashboard-create" href="/organizer/events/new">
          <Plus size={16} /> Create new event
        </Link>}

        <nav className="dashboard-nav" aria-label="Organizer navigation">
          <small>Workspace</small>
          {renderItems(primary as NavItem[])}

          {selectedEvent && <div className="event-switcher-wrap">
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
          </div>}

          {renderItems(eventLinks)}
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

                  {serverNotifications.slice(0, 4).map((item) => (
                    <button className={`notification-item${item.readAt ? "" : " unread"}`} key={item.id} type="button" role="menuitem">
                      <span className="notification-avatar notification-avatar--mint"><Mail size={17} /></span>
                      <p><b>{item.title}</b><small>{item.body}</small><time>{new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.createdAt))}</time></p>
                    </button>
                  ))}

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
                <span>{principal.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                <div><b>{principal.name}</b><small>{principal.role.replaceAll("_", " ")}</small></div>
                <ChevronDown size={15} />
              </button>

              {accountMenuOpen && (
                <div className="profile-dropdown" role="menu" aria-label="Account menu">
                  <header>
                    <span>{principal.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                    <p><b>{principal.name}</b><small>{principal.email}</small></p>
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

        <main className="dashboard-content"><OrganizerPermissionsProvider permissions={principal.permissions}>{children}</OrganizerPermissionsProvider></main>
      </div>

      {mobileOpen && <button className="dashboard-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
