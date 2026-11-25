import { and, eq, isNull } from "drizzle-orm";
import { roles, workspaceInvitations } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";
import { createOpaqueToken, hashToken } from "@/lib/auth/tokens";
import { sendTransactionalEmail } from "@/lib/integrations/email";
import { buildInvitationEmail } from "@/lib/integrations/invitation-email";

export async function DELETE(request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const id = requestId(request);
  const principal = await requirePermission("team.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to manage team invitations.", 403, null, id);
  const invitationId = (await params).invitationId;
  const db = getDatabase();
  const [invitation] = await db.select({ id: workspaceInvitations.id, email: workspaceInvitations.email }).from(workspaceInvitations).where(and(eq(workspaceInvitations.id, invitationId), eq(workspaceInvitations.organizerId, principal.organizerId), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt))).limit(1);
  if (!invitation) return fail("INVITATION_NOT_FOUND", "This pending invitation is no longer available.", 404, null, id);
  await db.update(workspaceInvitations).set({ revokedAt: new Date() }).where(eq(workspaceInvitations.id, invitation.id));
  await writeAudit({ organizerId: principal.organizerId, actorUserId: principal.userId, action: "member.invitation_revoked", targetType: "workspace_invitation", targetId: invitation.id, requestId: id, metadata: { email: invitation.email } });
  return ok({ revoked: true }, 200, id);
}

export async function POST(request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const id = requestId(request);
  const principal = await requirePermission("team.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to manage team invitations.", 403, null, id);
  const invitationId = (await params).invitationId;
  const db = getDatabase();
  const [invitation] = await db.select({ id: workspaceInvitations.id, email: workspaceInvitations.email, roleName: roles.name, eventScope: workspaceInvitations.eventScope }).from(workspaceInvitations).innerJoin(roles, eq(roles.id, workspaceInvitations.roleId)).where(and(eq(workspaceInvitations.id, invitationId), eq(workspaceInvitations.organizerId, principal.organizerId), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt))).limit(1);
  if (!invitation) return fail("INVITATION_NOT_FOUND", "This pending invitation is no longer available.", 404, null, id);
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.update(workspaceInvitations).set({ tokenHash: hashToken(token), invitedBy: principal.userId, expiresAt }).where(eq(workspaceInvitations.id, invitation.id));
  const origin = new URL(request.url).origin;
  const acceptUrl = `${origin}/api/v1/workspaces/invitations/accept?token=${encodeURIComponent(token)}`;
  await sendTransactionalEmail({ to: invitation.email, subject: "You're invited to NASA EVENT", html: buildInvitationEmail({ roleName: invitation.roleName, eventScope: invitation.eventScope, acceptUrl, expiresAt }) }).catch(() => undefined);
  await writeAudit({ organizerId: principal.organizerId, actorUserId: principal.userId, action: "member.invitation_resent", targetType: "workspace_invitation", targetId: invitation.id, requestId: id, metadata: { email: invitation.email } });
  return ok({ resent: true, expiresAt }, 200, id);
}
