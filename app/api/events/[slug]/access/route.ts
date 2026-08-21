import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { events, invitations } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { constantTimeEqual, createInvitationAccessToken, hashInvitationCode, invitationCookieName, normalizeEmail, verifyInvitationAccessToken } from "@/lib/security/invitations";

async function findEvent(slug: string) { const [event] = await getDatabase().select().from(events).where(eq(events.slug, slug)).limit(1); return event; }

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event) return NextResponse.json({ data: null, error: { code: "EVENT_NOT_FOUND", message: "Event not found." } }, { status: 404 });
  if (event.visibility === "public") return NextResponse.json({ data: { allowed: true, public: true }, error: null });
  const token = request.cookies.get(invitationCookieName(event.id))?.value;
  const session = token ? await verifyInvitationAccessToken(token) : null;
  if (!session || session.eventId !== event.id) return NextResponse.json({ data: { allowed: false }, error: null }, { status: 401 });
  const [invitation] = await getDatabase().select({ id: invitations.id, guestName: invitations.guestName, email: invitations.email, partyAllowance: invitations.partyAllowance, personalization: invitations.personalization, status: invitations.status }).from(invitations).where(and(eq(invitations.id, session.invitationId), eq(invitations.eventId, event.id))).limit(1);
  return invitation ? NextResponse.json({ data: { allowed: true, invitation }, error: null }) : NextResponse.json({ data: { allowed: false }, error: null }, { status: 401 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({})) as { email?: string; code?: string };
  const event = await findEvent(slug);
  if (!event) return NextResponse.json({ data: null, error: { code: "ACCESS_DENIED", message: "We could not verify those invitation details." } }, { status: 401 });
  if (event.visibility === "public") return NextResponse.json({ data: { allowed: true, public: true }, error: null });
  const email = normalizeEmail(body.email ?? "");
  const [invitation] = await getDatabase().select().from(invitations).where(and(eq(invitations.eventId, event.id), eq(invitations.emailNormalized, email))).limit(1);
  const valid = invitation && !invitation.revokedAt && (!invitation.expiresAt || invitation.expiresAt > new Date()) && constantTimeEqual(invitation.codeHash, await hashInvitationCode(event.id, email, body.code ?? ""));
  if (!valid) return NextResponse.json({ data: null, error: { code: "ACCESS_DENIED", message: "We could not verify those invitation details." } }, { status: 401 });
  const token = await createInvitationAccessToken({ invitationId: invitation.id, eventId: event.id, guestName: invitation.guestName });
  const response = NextResponse.json({ data: { allowed: true, invitation: { id: invitation.id, guestName: invitation.guestName, email: invitation.email, partyAllowance: invitation.partyAllowance, personalization: invitation.personalization, status: invitation.status } }, error: null });
  response.cookies.set(invitationCookieName(event.id), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: `/events/${slug}`, maxAge: 60 * 60 * 12 });
  return response;
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findEvent(slug);
  const response = NextResponse.json({ data: { cleared: true }, error: null });
  if (event) response.cookies.set(invitationCookieName(event.id), "", { httpOnly: true, path: `/events/${slug}`, maxAge: 0 });
  return response;
}
