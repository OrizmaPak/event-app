import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { events, invitations, notificationDeliveries, notifications } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { generateInvitationCode, hashInvitationCode } from "@/lib/security/invitations";
import { requirePermission } from "@/lib/auth/policy";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await requirePermission("guests.manage");
  if (!principal) return NextResponse.json({ data: null, error: { code: "FORBIDDEN", message: "You do not have permission to manage invitations." } }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { action?: "send-new-code" | "revoke" };
  const [record] = await getDatabase().select({ invitation: invitations, event: events }).from(invitations).innerJoin(events, eq(invitations.eventId, events.id)).where(and(eq(invitations.id, (await params).id), eq(events.organizerId, principal.organizerId))).limit(1);
  if (!record) return NextResponse.json({ data: null, error: { code: "INVITATION_NOT_FOUND", message: "Invitation not found." } }, { status: 404 });
  if (body.action === "revoke") { await getDatabase().update(invitations).set({ revokedAt: new Date(), status: "revoked", updatedAt: new Date() }).where(eq(invitations.id, record.invitation.id)); return NextResponse.json({ data: { status: "revoked" }, error: null }); }
  const code = generateInvitationCode(record.event.shortTitle);
  await getDatabase().update(invitations).set({ codeHash: await hashInvitationCode(record.event.id, record.invitation.email, code), deliveryStatus: "queued", lastSentAt: new Date(), revokedAt: null, status: "pending", updatedAt: new Date() }).where(eq(invitations.id, record.invitation.id));
  const [notification] = await getDatabase().insert(notifications).values({ organizerId: record.event.organizerId, eventId: record.event.id, invitationId: record.invitation.id, type: "invitation.resent", title: "New invitation code queued", body: `${record.invitation.guestName} will receive a replacement invitation code.` }).returning();
  await getDatabase().insert(notificationDeliveries).values({ notificationId: notification.id, channel: "email", recipient: record.invitation.email, subject: `Your updated invitation to ${record.event.title}`, content: `Your new invitation code is ${code}.`, status: "queued" });
  return NextResponse.json({ data: { code, deliveryPreview: "queued" }, error: null });
}
