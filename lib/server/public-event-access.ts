import type { NextRequest } from "next/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { events, invitations } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { invitationCookieName, verifyInvitationAccessToken } from "@/lib/security/invitations";

type EventRow = typeof events.$inferSelect;

export async function validEventInvitation(eventId: string, token?: string) {
  const access = token ? await verifyInvitationAccessToken(token) : null;
  if (access?.eventId !== eventId) return null;
  const [invitation] = await getDatabase().select({ id: invitations.id }).from(invitations).where(and(eq(invitations.id, access.invitationId), eq(invitations.eventId, eventId), isNull(invitations.revokedAt), or(isNull(invitations.expiresAt), gt(invitations.expiresAt, new Date())))).limit(1);
  return invitation?.id ?? null;
}

export async function hasEventPageAccess(event: { id: string; visibility: string }) {
  if (event.visibility === "public") return true;
  return Boolean(await validEventInvitation(event.id, (await cookies()).get(invitationCookieName(event.id))?.value));
}

export async function getPublicEventInvitation(request: NextRequest, event: EventRow) {
  if (event.visibility === "public") return { allowed: true, invitationId: null };
  const token = request.cookies.get(invitationCookieName(event.id))?.value;
  const invitationId = await validEventInvitation(event.id, token);
  return { allowed: Boolean(invitationId), invitationId };
}
