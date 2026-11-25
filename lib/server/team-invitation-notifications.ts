import { eq } from "drizzle-orm";
import { notificationDeliveries, notifications } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { sendTransactionalEmail } from "@/lib/integrations/email";

interface TeamInvitationDecision {
  organizerId: string;
  organizationName: string;
  invitationId: string;
  inviterEmail: string;
  inviterName: string;
  attendeeName: string;
  attendeeEmail: string;
  roleName: string;
  eventScope: string;
  decision: "accepted" | "declined";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function notifyTeamInvitationDecision(input: TeamInvitationDecision) {
  const decisionLabel = input.decision === "accepted" ? "accepted" : "declined";
  const accessLabel = input.eventScope === "all" ? "all events" : `the ${input.eventScope} event`;
  const title = `Team invitation ${decisionLabel}`;
  const body = `${input.attendeeName} (${input.attendeeEmail}) ${decisionLabel} the ${input.roleName} invitation for ${accessLabel}.`;
  const subject = `${input.attendeeName} ${decisionLabel} your team invitation`;
  const emailContent = `Hello ${input.inviterName},\n\n${input.attendeeName} (${input.attendeeEmail}) has ${decisionLabel} your invitation to join ${input.organizationName} as ${input.roleName}, with access to ${accessLabel}.`;
  const db = getDatabase();

  const deliveryId = await db.transaction(async (tx) => {
    const [notice] = await tx.insert(notifications).values({
      organizerId: input.organizerId,
      type: `team.invitation.${input.decision}`,
      title,
      body,
      data: { workspaceInvitationId: input.invitationId, email: input.attendeeEmail, role: input.roleName, eventScope: input.eventScope, decision: input.decision },
    }).returning({ id: notifications.id });
    const [delivery] = await tx.insert(notificationDeliveries).values({
      notificationId: notice.id,
      channel: "email",
      recipient: input.inviterEmail,
      subject,
      content: emailContent,
      status: "queued",
    }).returning({ id: notificationDeliveries.id });
    return delivery.id;
  });

  try {
    await db.update(notificationDeliveries).set({ status: "sending", attemptCount: 1 }).where(eq(notificationDeliveries.id, deliveryId));
    const email = await sendTransactionalEmail({
      to: input.inviterEmail,
      subject,
      html: `<div style="margin:0;background:#f5f4f8;padding:32px 16px;font-family:Arial,sans-serif;color:#211d2b"><div style="max-width:560px;margin:auto;overflow:hidden;border:1px solid #e5e1ed;border-radius:12px;background:#fff"><div style="padding:24px 28px;background:#6e50ff;color:#fff;font-weight:800;letter-spacing:.04em">NASA EVENT</div><div style="padding:28px"><p style="margin:0 0 8px;color:#6e50ff;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">TEAM INVITATION UPDATE</p><h1 style="margin:0 0 16px;font-size:24px">${escapeHtml(input.attendeeName)} ${decisionLabel}.</h1><p style="margin:0;line-height:1.65">${escapeHtml(input.attendeeName)} (${escapeHtml(input.attendeeEmail)}) has ${decisionLabel} your invitation to join <strong>${escapeHtml(input.organizationName)}</strong> as ${escapeHtml(input.roleName)}, with access to ${escapeHtml(accessLabel)}.</p></div><div style="padding:16px 28px;border-top:1px solid #eeeaf3;color:#6e6877;font-size:12px">This update was sent to the person who invited this team member.</div></div></div>`,
    });
    await db.update(notificationDeliveries).set({ status: email.status, providerReference: email.providerReference ?? null, sentAt: email.status === "sent" ? new Date() : null, lastError: null }).where(eq(notificationDeliveries.id, deliveryId));
  } catch (error) {
    await db.update(notificationDeliveries).set({ status: "retry", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Email delivery failed" }).where(eq(notificationDeliveries.id, deliveryId));
    console.error("Unable to send team invitation decision email", error);
  }
}
