import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { organizerMembers, organizers, roles, users, workspaceInvitations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { hashToken, normalizeEmail } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { notifyTeamInvitationDecision } from "@/lib/server/team-invitation-notifications";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/organizer/login?invite=invalid", request.url));
  const returnTo = `/api/v1/workspaces/invitations/accept?token=${encodeURIComponent(token)}`;
  const current = await getCurrentUser();
  if (!current) return NextResponse.redirect(new URL(`/organizer/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));
  const db = getDatabase();
  const [invitation] = await db.select({ invitation: workspaceInvitations, role: roles, organizationName: organizers.name, inviterEmail: users.email, inviterFirstName: users.firstName, inviterLastName: users.lastName }).from(workspaceInvitations).innerJoin(roles, eq(roles.id, workspaceInvitations.roleId)).innerJoin(organizers, eq(organizers.id, workspaceInvitations.organizerId)).innerJoin(users, eq(users.id, workspaceInvitations.invitedBy)).where(and(eq(workspaceInvitations.tokenHash, hashToken(token)), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt), gt(workspaceInvitations.expiresAt, new Date()))).limit(1);
  if (!invitation || normalizeEmail(current.user.email) !== invitation.invitation.emailNormalized) return NextResponse.redirect(new URL("/organizer/login?invite=invalid", request.url));
  await db.transaction(async (tx) => {
    await tx.insert(organizerMembers).values({ organizerId: invitation.invitation.organizerId, userKey: current.user.id, userId: current.user.id, email: current.user.email, role: invitation.role.key, roleId: invitation.role.id, eventScope: invitation.invitation.eventScope, status: "active", invitedAt: invitation.invitation.createdAt, acceptedAt: new Date() }).onConflictDoNothing();
    await tx.update(workspaceInvitations).set({ acceptedAt: new Date() }).where(eq(workspaceInvitations.id, invitation.invitation.id));
  });
  try {
    await notifyTeamInvitationDecision({ organizerId: invitation.invitation.organizerId, organizationName: invitation.organizationName, invitationId: invitation.invitation.id, inviterEmail: invitation.inviterEmail, inviterName: [invitation.inviterFirstName, invitation.inviterLastName].filter(Boolean).join(" ") || invitation.inviterEmail, attendeeName: [current.user.firstName, current.user.lastName].filter(Boolean).join(" ") || current.user.email, attendeeEmail: current.user.email, roleName: invitation.role.name, eventScope: invitation.invitation.eventScope, decision: "accepted" });
  } catch (error) { console.error("Unable to record accepted team invitation notification", error); }
  return NextResponse.redirect(new URL("/account?invite=accepted", request.url));
}
