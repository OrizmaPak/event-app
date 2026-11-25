import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, eventStaffAssignments, events, memberPermissionOverrides, organizerMembers, rolePermissions, roles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

type RouteContext = { params: Promise<{ slug: string }> };
const issueSchema = z.object({ userId: z.string().uuid() });

async function loadCheckInStaff(organizerId: string, eventSlug: string) {
  const db = getDatabase();
  const [event] = await db.select({ id: events.id, organizerId: events.organizerId, createdByUserId: events.createdByUserId, startAt: events.startAt, endAt: events.endAt }).from(events).where(and(eq(events.slug, eventSlug), eq(events.organizerId, organizerId))).limit(1);
  if (!event) return null;
  const [creationAudit] = await db.select({ actorUserId: auditLogs.actorUserId }).from(auditLogs).where(and(eq(auditLogs.eventId, event.id), inArray(auditLogs.action, ["event.created", "event.submitted_for_approval", "event.published_auto_approved"]))).orderBy(asc(auditLogs.createdAt)).limit(1);
  const eventCreatorUserId = event.createdByUserId ?? creationAudit?.actorUserId ?? null;

  const members = await db.select({ userId: organizerMembers.userId, email: users.email, firstName: users.firstName, lastName: users.lastName, role: organizerMembers.role, roleId: organizerMembers.roleId, roleKey: roles.key, roleName: roles.name, eventScope: organizerMembers.eventScope })
    .from(organizerMembers)
    .leftJoin(users, eq(users.id, organizerMembers.userId))
    .leftJoin(roles, eq(roles.id, organizerMembers.roleId))
    .where(and(eq(organizerMembers.organizerId, organizerId), eq(organizerMembers.status, "active"), or(eq(organizerMembers.eventScope, "all"), eq(organizerMembers.eventScope, eventSlug))));
  const userIds = members.flatMap((member) => member.userId ? [member.userId] : []);
  const roleIds = members.flatMap((member) => member.roleId ? [member.roleId] : []);
  const [grants, overrides, assignments, codeAudit] = await Promise.all([
    roleIds.length ? db.select({ roleId: rolePermissions.roleId, permission: rolePermissions.permissionKey }).from(rolePermissions).where(inArray(rolePermissions.roleId, roleIds)) : Promise.resolve([]),
    userIds.length ? db.select({ userId: memberPermissionOverrides.userId, permission: memberPermissionOverrides.permissionKey, effect: memberPermissionOverrides.effect }).from(memberPermissionOverrides).where(and(eq(memberPermissionOverrides.organizerId, organizerId), inArray(memberPermissionOverrides.userId, userIds))) : Promise.resolve([]),
    db.select({ userId: eventStaffAssignments.userId, id: eventStaffAssignments.id, accessCodeHash: eventStaffAssignments.accessCodeHash, accessCodeEncrypted: eventStaffAssignments.accessCodeEncrypted, expiresAt: eventStaffAssignments.expiresAt }).from(eventStaffAssignments).where(and(eq(eventStaffAssignments.organizerId, organizerId), eq(eventStaffAssignments.eventId, event.id), eq(eventStaffAssignments.status, "active"))),
    db.select({ targetId: auditLogs.targetId, action: auditLogs.action }).from(auditLogs).where(and(eq(auditLogs.eventId, event.id), inArray(auditLogs.action, ["checkin.staff_code_issued", "checkin.staff_code_replaced", "checkin.staff_code_disabled"]))).orderBy(desc(auditLogs.createdAt)),
  ]);
  const codeHistory = new Map<string, string>();
  for (const entry of codeAudit) {
    if (entry.targetId && !codeHistory.has(entry.targetId)) codeHistory.set(entry.targetId, entry.action);
  }

  const staff = members.flatMap((member) => {
    if (!member.userId || !member.email) return [];
    const roleKey = member.roleKey ?? member.role;
    const permissions = new Set(roleKey === "owner" ? ["*"] : grants.filter((grant) => grant.roleId === member.roleId).map((grant) => grant.permission));
    for (const override of overrides.filter((entry) => entry.userId === member.userId)) {
      if (override.effect === "deny") permissions.delete(override.permission);
      if (override.effect === "allow") permissions.add(override.permission);
    }
    if (!permissions.has("*") && !permissions.has("checkin.operate")) return [];
    const assignment = assignments.find((entry) => entry.userId === member.userId);
    const hasCode = Boolean(assignment?.accessCodeHash && assignment.expiresAt && assignment.expiresAt > new Date());
    const codeStatus = hasCode ? "issued" : codeHistory.get(member.userId) === "checkin.staff_code_disabled" ? "disabled" : "not_issued";
    return [{ userId: member.userId, email: member.email, name: [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email, roleName: member.roleName ?? roleKey, hasCode, codeStatus, codeRetrievable: Boolean(hasCode && assignment?.accessCodeEncrypted), expiresAt: assignment?.expiresAt?.toISOString() ?? null }];
  });
  return { event, eventCreatorUserId, staff };
}

export async function GET(request: Request, { params }: RouteContext) {
  const id = requestId(request);
  const principal = await requirePermission("checkin.supervise");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to manage check-in staff codes.", 403, null, id);
  const { slug } = await params;
  const data = await loadCheckInStaff(principal.organizerId, slug);
  if (!data) return fail("EVENT_NOT_FOUND", "Event not found in this workspace.", 404, null, id);
  const userId = new URL(request.url).searchParams.get("userId");
  if (userId) {
    if (data.eventCreatorUserId !== principal.userId && userId !== principal.userId) return fail("FORBIDDEN", "You can only view your own staff code.", 403, null, id);
    const staff = data.staff.find((member) => member.userId === userId);
    if (!staff?.hasCode) return fail("CODE_NOT_ACTIVE", "This staff code is not active.", 404, null, id);
    const [assignment] = await getDatabase().select({ encryptedCode: eventStaffAssignments.accessCodeEncrypted }).from(eventStaffAssignments).where(and(eq(eventStaffAssignments.organizerId, principal.organizerId), eq(eventStaffAssignments.eventId, data.event.id), eq(eventStaffAssignments.userId, userId), eq(eventStaffAssignments.status, "active"))).limit(1);
    if (!assignment?.encryptedCode) return fail("CODE_REISSUE_REQUIRED", "This code was issued before secure viewing was available. Replace it to create a viewable code.", 409, null, id);
    try {
      const response = ok({ userId, code: decryptSecret(assignment.encryptedCode) }, 200, id);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch { return fail("CODE_REISSUE_REQUIRED", "This code cannot be decrypted. Replace it to create a viewable code.", 409, null, id); }
  }
  return ok({ staff: data.staff, viewerUserId: principal.userId, canIssueCodes: data.eventCreatorUserId === principal.userId }, 200, id);
}

export async function POST(request: Request, { params }: RouteContext) {
  const id = requestId(request);
  const principal = await requirePermission("checkin.supervise");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to issue check-in staff codes.", 403, null, id);
  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose a valid staff member.", 400, null, id);
  const { slug } = await params;
  const data = await loadCheckInStaff(principal.organizerId, slug);
  if (!data) return fail("EVENT_NOT_FOUND", "Event not found in this workspace.", 404, null, id);
  if (data.eventCreatorUserId !== principal.userId) return fail("FORBIDDEN", "Only the person who created this event can issue or replace staff codes.", 403, null, id);
  const staff = data.staff.find((member) => member.userId === parsed.data.userId);
  if (!staff) return fail("STAFF_NOT_ASSIGNED", "This person is not an active check-in staff member for this event.", 403, null, id);

  const code = Array.from({ length: 12 }, () => randomInt(10)).join("");
  const expiresAt = data.event.endAt ?? new Date(data.event.startAt.getTime() + 24 * 60 * 60 * 1000);
  if (expiresAt <= new Date()) return fail("EVENT_ENDED", "Staff codes cannot be issued for an event that has ended.", 400, null, id);
  const db = getDatabase();
  await db.insert(eventStaffAssignments).values({ organizerId: principal.organizerId, eventId: data.event.id, userId: staff.userId, status: "active", accessCodeHash: hashToken(code), accessCodeEncrypted: encryptSecret(code), expiresAt })
    .onConflictDoUpdate({ target: [eventStaffAssignments.eventId, eventStaffAssignments.userId], set: { accessCodeHash: hashToken(code), accessCodeEncrypted: encryptSecret(code), expiresAt, status: "active" } });
  await writeAudit({ organizerId: principal.organizerId, eventId: data.event.id, actorUserId: principal.userId, action: staff.hasCode ? "checkin.staff_code_replaced" : "checkin.staff_code_issued", targetType: "event_staff_assignment", targetId: staff.userId, requestId: id, metadata: { staffEmail: staff.email, eventSlug: slug, staffUserId: staff.userId } });
  const response = ok({ staff: { userId: staff.userId, name: staff.name, email: staff.email }, code, expiresAt }, 201, id);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const id = requestId(request);
  const principal = await requirePermission("checkin.supervise");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to manage check-in staff codes.", 403, null, id);
  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose a valid staff member.", 400, null, id);
  const { slug } = await params;
  const data = await loadCheckInStaff(principal.organizerId, slug);
  if (!data) return fail("EVENT_NOT_FOUND", "Event not found in this workspace.", 404, null, id);
  if (data.eventCreatorUserId !== principal.userId) return fail("FORBIDDEN", "Only the person who created this event can disable staff codes.", 403, null, id);
  const staff = data.staff.find((member) => member.userId === parsed.data.userId);
  if (!staff) return fail("STAFF_NOT_ASSIGNED", "This person is not an active check-in staff member for this event.", 403, null, id);
  await getDatabase().update(eventStaffAssignments).set({ accessCodeHash: null, accessCodeEncrypted: null, expiresAt: null }).where(and(eq(eventStaffAssignments.organizerId, principal.organizerId), eq(eventStaffAssignments.eventId, data.event.id), eq(eventStaffAssignments.userId, staff.userId), eq(eventStaffAssignments.status, "active")));
  await writeAudit({ organizerId: principal.organizerId, eventId: data.event.id, actorUserId: principal.userId, action: "checkin.staff_code_disabled", targetType: "event_staff_assignment", targetId: staff.userId, requestId: id, metadata: { staffEmail: staff.email, staffUserId: staff.userId, eventSlug: slug } });
  return ok({ disabled: true, userId: staff.userId }, 200, id);
}
