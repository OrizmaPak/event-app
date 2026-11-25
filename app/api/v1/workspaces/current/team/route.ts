import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { events, memberPermissionOverrides, organizerMembers, roles, users, workspaceInvitations } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { createOpaqueToken, hashToken, normalizeEmail } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { sendTransactionalEmail } from "@/lib/integrations/email";
import { buildInvitationEmail } from "@/lib/integrations/invitation-email";
import { writeAudit } from "@/lib/server/audit";

const invitationSchema = z.object({ email: z.string().trim().email(), roleId: z.string().uuid(), eventScope: z.string().trim().min(1).max(200).default("all") });

export async function GET() {
  const principal = await requirePermission("team.view");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to view the team.", 403);
  const db = getDatabase();
  const members = await db.select({ userKey: organizerMembers.userKey, userId: organizerMembers.userId, email: organizerMembers.email, memberRole: organizerMembers.role, status: organizerMembers.status, eventScope: organizerMembers.eventScope, createdAt: organizerMembers.createdAt, firstName: users.firstName, lastName: users.lastName, roleId: roles.id, roleKey: roles.key, roleName: roles.name }).from(organizerMembers).leftJoin(users, eq(users.id, organizerMembers.userId)).leftJoin(roles, eq(roles.id, organizerMembers.roleId)).where(eq(organizerMembers.organizerId, principal.organizerId));
  const overrides = await db.select().from(memberPermissionOverrides).where(eq(memberPermissionOverrides.organizerId, principal.organizerId));
  const invitations = await db.select({ id: workspaceInvitations.id, email: workspaceInvitations.email, roleId: workspaceInvitations.roleId, eventScope: workspaceInvitations.eventScope, expiresAt: workspaceInvitations.expiresAt, createdAt: workspaceInvitations.createdAt, roleName: roles.name }).from(workspaceInvitations).innerJoin(roles, eq(roles.id, workspaceInvitations.roleId)).where(and(eq(workspaceInvitations.organizerId, principal.organizerId), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt))).orderBy(desc(workspaceInvitations.createdAt));
  const eventOptions = await db.select({ id: events.id, slug: events.slug, title: events.title, status: events.status, startAt: events.startAt }).from(events).where(eq(events.organizerId, principal.organizerId)).orderBy(asc(events.startAt));
  return ok({ members: members.map((member) => ({ ...member, name: [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email, roleName: member.roleName ?? member.memberRole, overrides: overrides.filter((entry) => entry.userId === member.userId).map((entry) => ({ permissionKey: entry.permissionKey, effect: entry.effect })) })), invitations, events: eventOptions });
}

export async function POST(request: Request) {
  const id = requestId(request);
  const principal = await requirePermission("team.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to invite team members.", 403, null, id);
  const parsed = invitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Enter a valid email address, role and event scope.", 400, null, id);
  const db = getDatabase();
  const [role] = await db.select().from(roles).where(and(eq(roles.id, parsed.data.roleId), eq(roles.organizerId, principal.organizerId), eq(roles.status, "active"))).limit(1);
  if (!role || role.key === "owner") return fail("INVALID_ROLE", "Choose a valid non-owner role.", 400, null, id);
  const emailNormalized = normalizeEmail(parsed.data.email);
  const [member] = await db.select({ userKey: organizerMembers.userKey }).from(organizerMembers).where(and(eq(organizerMembers.organizerId, principal.organizerId), eq(organizerMembers.email, emailNormalized))).limit(1);
  if (member) return fail("MEMBER_EXISTS", "This person is already a workspace member.", 409, null, id);
  const token = createOpaqueToken();
  const [invitation] = await db.insert(workspaceInvitations).values({ organizerId: principal.organizerId, email: parsed.data.email.trim(), emailNormalized, roleId: role.id, eventScope: parsed.data.eventScope, tokenHash: hashToken(token), invitedBy: principal.userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }).returning();
  const origin = new URL(request.url).origin;
  await sendTransactionalEmail({ to: invitation.email, subject: "You're invited to NASA EVENT", html: buildInvitationEmail({ roleName: role.name, eventScope: invitation.eventScope, acceptUrl: `${origin}/api/v1/workspaces/invitations/accept?token=${encodeURIComponent(token)}`, expiresAt: invitation.expiresAt }) }).catch(() => undefined);
  await writeAudit({ organizerId: principal.organizerId, actorUserId: principal.userId, action: "member.invited", targetType: "workspace_invitation", targetId: invitation.id, requestId: id, metadata: { email: emailNormalized, role: role.key, eventScope: parsed.data.eventScope } });
  return ok({ invitation: { id: invitation.id, email: invitation.email, roleName: role.name, eventScope: invitation.eventScope, expiresAt: invitation.expiresAt }, invitationPreview: process.env.NODE_ENV === "production" ? undefined : `${origin}/api/v1/workspaces/invitations/accept?token=${token}` }, 201, id);
}
