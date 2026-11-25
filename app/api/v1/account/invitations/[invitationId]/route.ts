import { and, eq, gt, isNull } from "drizzle-orm";
import { organizerMembers, organizers, roles, users, workspaceInvitations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/auth/tokens";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { getDatabase } from "@/lib/db/client";
import { writeAudit } from "@/lib/server/audit";
import { notifyTeamInvitationDecision } from "@/lib/server/team-invitation-notifications";

type RouteContext = { params: Promise<{ invitationId: string }> };

async function findInvitation(invitationId: string, email: string) {
  const [record] = await getDatabase()
    .select({ invitation: workspaceInvitations, role: roles, organizerName: organizers.name, inviterEmail: users.email, inviterFirstName: users.firstName, inviterLastName: users.lastName })
    .from(workspaceInvitations)
    .innerJoin(roles, eq(roles.id, workspaceInvitations.roleId))
    .innerJoin(organizers, eq(organizers.id, workspaceInvitations.organizerId))
    .innerJoin(users, eq(users.id, workspaceInvitations.invitedBy))
    .where(and(
      eq(workspaceInvitations.id, invitationId),
      eq(workspaceInvitations.emailNormalized, normalizeEmail(email)),
      isNull(workspaceInvitations.acceptedAt),
      isNull(workspaceInvitations.revokedAt),
      gt(workspaceInvitations.expiresAt, new Date()),
    ))
    .limit(1);
  return record;
}

export async function POST(request: Request, { params }: RouteContext) {
  const id = requestId(request);
  const current = await getCurrentUser();
  if (!current) return fail("UNAUTHORIZED", "Sign in to accept this invitation.", 401, null, id);
  const invitationId = (await params).invitationId;
  const record = await findInvitation(invitationId, current.user.email);
  if (!record) return fail("INVITATION_UNAVAILABLE", "This invitation has expired or is no longer available for your account.", 404, null, id);

  const db = getDatabase();
  const acceptedAt = new Date();
  const result = await db.transaction(async (tx) => {
    const [claimed] = await tx.update(workspaceInvitations)
      .set({ acceptedAt })
      .where(and(
        eq(workspaceInvitations.id, invitationId),
        eq(workspaceInvitations.emailNormalized, normalizeEmail(current.user.email)),
        isNull(workspaceInvitations.acceptedAt),
        isNull(workspaceInvitations.revokedAt),
        gt(workspaceInvitations.expiresAt, acceptedAt),
      ))
      .returning({ id: workspaceInvitations.id });
    if (!claimed) return false;

    await tx.insert(organizerMembers).values({
      organizerId: record.invitation.organizerId,
      userKey: current.user.id,
      userId: current.user.id,
      email: current.user.email,
      role: record.role.key,
      roleId: record.role.id,
      eventScope: record.invitation.eventScope,
      status: "active",
      invitedAt: record.invitation.createdAt,
      acceptedAt,
    }).onConflictDoNothing();
    return true;
  });

  if (!result) return fail("INVITATION_UNAVAILABLE", "This invitation was already handled or has expired.", 409, null, id);
  await writeAudit({ organizerId: record.invitation.organizerId, actorUserId: current.user.id, action: "member.invitation_accepted", targetType: "workspace_invitation", targetId: invitationId, requestId: id, metadata: { email: normalizeEmail(current.user.email) } });
  try {
    await notifyTeamInvitationDecision({ organizerId: record.invitation.organizerId, organizationName: record.organizerName, invitationId, inviterEmail: record.inviterEmail, inviterName: [record.inviterFirstName, record.inviterLastName].filter(Boolean).join(" ") || record.inviterEmail, attendeeName: [current.user.firstName, current.user.lastName].filter(Boolean).join(" ") || current.user.email, attendeeEmail: current.user.email, roleName: record.role.name, eventScope: record.invitation.eventScope, decision: "accepted" });
  } catch (error) { console.error("Unable to record accepted team invitation notification", error); }
  return ok({ accepted: true, organization: record.organizerName }, 200, id);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const id = requestId(request);
  const current = await getCurrentUser();
  if (!current) return fail("UNAUTHORIZED", "Sign in to decline this invitation.", 401, null, id);
  const invitationId = (await params).invitationId;
  const record = await findInvitation(invitationId, current.user.email);
  if (!record) return fail("INVITATION_UNAVAILABLE", "This invitation has expired or is no longer available for your account.", 404, null, id);

  const declinedAt = new Date();
  const [declined] = await getDatabase().update(workspaceInvitations)
    .set({ revokedAt: declinedAt })
    .where(and(
      eq(workspaceInvitations.id, invitationId),
      eq(workspaceInvitations.emailNormalized, normalizeEmail(current.user.email)),
      isNull(workspaceInvitations.acceptedAt),
      isNull(workspaceInvitations.revokedAt),
      gt(workspaceInvitations.expiresAt, declinedAt),
    ))
    .returning({ id: workspaceInvitations.id });
  if (!declined) return fail("INVITATION_UNAVAILABLE", "This invitation was already handled or has expired.", 409, null, id);

  await writeAudit({ organizerId: record.invitation.organizerId, actorUserId: current.user.id, action: "member.invitation_declined", targetType: "workspace_invitation", targetId: invitationId, requestId: id, metadata: { email: normalizeEmail(current.user.email) } });
  try {
    await notifyTeamInvitationDecision({ organizerId: record.invitation.organizerId, organizationName: record.organizerName, invitationId, inviterEmail: record.inviterEmail, inviterName: [record.inviterFirstName, record.inviterLastName].filter(Boolean).join(" ") || record.inviterEmail, attendeeName: [current.user.firstName, current.user.lastName].filter(Boolean).join(" ") || current.user.email, attendeeEmail: current.user.email, roleName: record.role.name, eventScope: record.invitation.eventScope, decision: "declined" });
  } catch (error) { console.error("Unable to record declined team invitation notification", error); }
  return ok({ declined: true, organization: record.organizerName }, 200, id);
}
