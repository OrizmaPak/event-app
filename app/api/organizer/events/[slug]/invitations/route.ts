import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { events, invitations, notificationDeliveries, notifications } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { generateInvitationCode, hashInvitationCode, normalizeEmail } from "@/lib/security/invitations";
import { requirePermission } from "@/lib/auth/policy";

async function eventForOrganizer(slug: string, organizerId: string) { const [event] = await getDatabase().select().from(events).where(and(eq(events.slug, slug), eq(events.organizerId, organizerId))).limit(1); return event; }

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const principal = await requirePermission("guests.view");
  if (!principal) return NextResponse.json({ data: null, error: { code: "FORBIDDEN", message: "You do not have access to guest information." } }, { status: 403 });
  const event = await eventForOrganizer((await params).slug, principal.organizerId);
  if (!event) return NextResponse.json({ data: null, error: { code: "EVENT_NOT_FOUND", message: "Event not found." } }, { status: 404 });
  const rows = await getDatabase().select({ id: invitations.id, guestName: invitations.guestName, email: invitations.email, phone: invitations.phone, partyAllowance: invitations.partyAllowance, personalization: invitations.personalization, status: invitations.status, deliveryStatus: invitations.deliveryStatus, lastSentAt: invitations.lastSentAt, createdAt: invitations.createdAt, revokedAt: invitations.revokedAt }).from(invitations).where(eq(invitations.eventId, event.id)).orderBy(desc(invitations.createdAt));
  return NextResponse.json({ data: rows, error: null });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const principal = await requirePermission("guests.manage");
  if (!principal) return NextResponse.json({ data: null, error: { code: "FORBIDDEN", message: "You do not have permission to manage invitations." } }, { status: 403 });
  const event = await eventForOrganizer((await params).slug, principal.organizerId);
  if (!event) return NextResponse.json({ data: null, error: { code: "EVENT_NOT_FOUND", message: "Event not found." } }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { guestName?: string; email?: string; phone?: string; partyAllowance?: number; personalization?: Record<string, unknown>; sendNow?: boolean };
  const guestName = body.guestName?.trim() ?? "";
  const email = normalizeEmail(body.email ?? "");
  if (!guestName || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ data: null, error: { code: "VALIDATION_ERROR", message: "Enter a guest name and valid email." }, fieldErrors: { guestName: guestName ? null : "Name is required", email: /^\S+@\S+\.\S+$/.test(email) ? null : "Valid email is required" } }, { status: 400 });
  const [existing] = await getDatabase().select({ id: invitations.id }).from(invitations).where(and(eq(invitations.eventId, event.id), eq(invitations.emailNormalized, email))).limit(1);
  if (existing) return NextResponse.json({ data: null, error: { code: "INVITATION_EXISTS", message: "This email already has an invitation for the event." } }, { status: 409 });
  const code = generateInvitationCode(event.shortTitle);
  const [invitation] = await getDatabase().insert(invitations).values({ eventId: event.id, guestName, email, emailNormalized: email, phone: body.phone?.trim() || null, partyAllowance: Math.max(1, Math.min(50, Number(body.partyAllowance) || 1)), codeHash: await hashInvitationCode(event.id, email, code), personalization: body.personalization ?? {}, deliveryStatus: body.sendNow ? "queued" : "draft", lastSentAt: body.sendNow ? new Date() : null }).returning();
  const [notification] = await getDatabase().insert(notifications).values({ organizerId: event.organizerId, eventId: event.id, invitationId: invitation.id, type: "invitation.created", title: "Invitation prepared", body: `${guestName}'s invitation is ${body.sendNow ? "queued for delivery" : "saved as a draft"}.`, data: { guestName, email } }).returning();
  if (body.sendNow) await getDatabase().insert(notificationDeliveries).values({ notificationId: notification.id, channel: "email", recipient: email, subject: `Your invitation to ${event.title}`, content: `Hello ${guestName}, open /events/${event.slug} and use invitation code ${code}.`, status: "queued" });
  return NextResponse.json({ data: { invitation: { ...invitation, codeHash: undefined }, code, deliveryPreview: body.sendNow ? "queued" : "draft" }, error: null }, { status: 201 });
}
