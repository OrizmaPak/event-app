import Link from "next/link";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { ArrowRight, Building2, CalendarDays, Check, Clock3, Mail, Plus, Ticket } from "lucide-react";
import { AccountInvitationActions } from "@/components/dashboard/AccountInvitationActions";
import { MyCheckInCodes } from "@/components/dashboard/MyCheckInCodes";
import { events, organizerMembers, organizers, roles, workspaceInvitations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";

export default async function AccountDashboardPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const current = await getCurrentUser();
  if (!current) return null;
  const db = getDatabase();
  const memberships = await db.select({ organizerId: organizerMembers.organizerId, organizerName: organizers.name, organizerSlug: organizers.slug, organizerStatus: organizers.status, role: organizerMembers.role, eventScope: organizerMembers.eventScope }).from(organizerMembers).innerJoin(organizers, eq(organizers.id, organizerMembers.organizerId)).where(and(eq(organizerMembers.userId, current.user.id), eq(organizerMembers.status, "active")));
  const pendingInvitations = await db.select({ id: workspaceInvitations.id, organizerName: organizers.name, organizerSlug: organizers.slug, roleName: roles.name, eventScope: workspaceInvitations.eventScope, expiresAt: workspaceInvitations.expiresAt, createdAt: workspaceInvitations.createdAt }).from(workspaceInvitations).innerJoin(organizers, eq(organizers.id, workspaceInvitations.organizerId)).innerJoin(roles, eq(roles.id, workspaceInvitations.roleId)).where(and(eq(workspaceInvitations.emailNormalized, normalizeEmail(current.user.email)), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt), gt(workspaceInvitations.expiresAt, new Date()))).orderBy(desc(workspaceInvitations.createdAt));
  const eventRules = memberships.map((membership) => membership.eventScope === "all" ? eq(events.organizerId, membership.organizerId) : and(eq(events.organizerId, membership.organizerId), eq(events.slug, membership.eventScope)));
  const scopedEvents = eventRules.length ? await getDatabase().select({ id: events.id, organizerId: events.organizerId, slug: events.slug, title: events.title, startAt: events.startAt, venue: events.venue, city: events.city }).from(events).where(or(...eventRules)) : [];
  const params = await searchParams;
  return <div className="account-dashboard">
    <header className="account-dashboard__welcome">
      <div><span>YOUR ACCOUNT</span><h1>Welcome back, {current.user.firstName}</h1><p>Manage your organizations, invitations, and event access from one place.</p></div>
      <Link className="button button--brand" href="/account/create-organization"><Plus size={17} /> Create organization</Link>
    </header>
    {params.invite === "accepted" && <div className="form-success"><Check size={17} /> Invitation accepted. Your organization access is ready.</div>}
    <section className="account-summary" aria-label="Account summary">
      <article><span className="account-summary__icon account-summary__icon--violet"><Building2 size={18} /></span><div><small>ORGANIZATIONS</small><b>{memberships.length}</b></div></article>
      <article><span className="account-summary__icon account-summary__icon--mint"><Ticket size={18} /></span><div><small>EVENT ACCESS</small><b>{scopedEvents.length}</b></div></article>
      <article><span className="account-summary__icon account-summary__icon--amber"><Clock3 size={18} /></span><div><small>INVITATIONS</small><b>{pendingInvitations.length}</b></div></article>
    </section>
    {pendingInvitations.length > 0 && <section className="account-invitations"><header><div><small>NEEDS YOUR ATTENTION</small><h2>Organization invitations</h2><p>Invitations sent to <b>{current.user.email}</b> appear here.</p></div><span>{pendingInvitations.length}</span></header><div>{pendingInvitations.map((invitation) => <article key={invitation.id}><span className="account-invitation-icon"><Mail size={18} /></span><div><b>{invitation.organizerName}</b><p>{invitation.roleName} <span>·</span> {invitation.eventScope === "all" ? "All events" : `Event: ${invitation.eventScope}`}</p><small>Sent {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(invitation.createdAt))} · Expires {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(invitation.expiresAt))}</small></div><AccountInvitationActions invitationId={invitation.id} /></article>)}</div></section>}
    <MyCheckInCodes />
    <section className="account-organizations">
      <header className="account-section-heading"><div><span>WORKSPACES</span><h2>Your organizations</h2><p>Choose an organization or event to continue.</p></div>{memberships.length > 0 && <span>{memberships.length} {memberships.length === 1 ? "organization" : "organizations"}</span>}</header>
      {!memberships.length ? <section className="account-empty-state"><span><Building2 size={22} /></span><h3>No organization access yet</h3><p>{pendingInvitations.length ? "Review the invitation above and choose Accept or Decline." : "When you are invited to an organization, it will appear here. You can also create an organization of your own."}</p><Link className="button button--quiet" href="/account/create-organization"><Plus size={16} /> Create organization</Link></section> : <div className="account-organization-list">{memberships.map((membership) => <article className="account-organization-card" key={membership.organizerId}>
        <div className="account-organization-card__main"><div className="account-organization-card__head"><div className="account-organization-card__identity"><span className="account-organization-card__icon"><Building2 size={18} /></span><div><small>ORGANIZATION</small><h3>{membership.organizerName}</h3></div></div><span className={`account-organization-card__status account-organization-card__status--${membership.organizerStatus}`}>{membership.organizerStatus === "pending" ? "Awaiting approval" : "Active"}</span></div><p className="account-organization-card__role">{membership.role.replaceAll("_", " ")} <span>·</span> {membership.eventScope === "all" ? "All events" : "Assigned event only"}</p>{membership.role === "owner" && membership.organizerStatus === "active" && <Link className="account-workspace-link" href="/organizer"><span>Open organizer workspace</span><ArrowRight size={15} /></Link>}</div>
        <div className="account-organization-card__events"><header><span>EVENTS YOU CAN ACCESS</span><b>{scopedEvents.filter((event) => event.organizerId === membership.organizerId && (membership.eventScope === "all" || membership.eventScope === event.slug)).length}</b></header>{scopedEvents.filter((event) => event.organizerId === membership.organizerId && (membership.eventScope === "all" || membership.eventScope === event.slug)).length ? scopedEvents.filter((event) => event.organizerId === membership.organizerId && (membership.eventScope === "all" || membership.eventScope === event.slug)).map((event) => <Link className="account-event-link" href={`/organizer/events/${event.slug}`} key={event.id}><span className="account-event-icon"><CalendarDays size={17} /></span><span><b>{event.title}</b><small>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(event.startAt))} · {event.venue}, {event.city}</small></span><ArrowRight size={16} /></Link>) : <p className="account-no-events">No events are assigned to this organization yet.</p>}</div>
      </article>)}</div>}
    </section>
  </div>;
}
