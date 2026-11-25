import { and, eq, gt, inArray, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { eventStaffAssignments, events, memberPermissionOverrides, organizerMembers, rolePermissions, roles, users } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { hashToken } from "@/lib/auth/tokens";
import { requirePermission, type WorkspacePrincipal } from "@/lib/auth/policy";
import type { PermissionKey } from "@/lib/auth/permissions";

const staffCodeCookie = "nasa_checkin_staff";

export function eventStaffCodeCookieName(_eventSlug?: string) {
  return staffCodeCookie;
}

export async function getEventStaffCodePrincipal(codeOverride?: string): Promise<(WorkspacePrincipal & { eventSlug: string; expiresAt: Date }) | null> {
  const code = codeOverride ?? (await cookies()).get(staffCodeCookie)?.value;
  if (!code) return null;
  const db = getDatabase();
  const [record] = await db.select({ assignment: eventStaffAssignments, event: events, member: organizerMembers, roleKey: roles.key, user: users })
    .from(eventStaffAssignments)
    .innerJoin(events, eq(events.id, eventStaffAssignments.eventId))
    .innerJoin(organizerMembers, and(eq(organizerMembers.organizerId, eventStaffAssignments.organizerId), eq(organizerMembers.userId, eventStaffAssignments.userId)))
    .innerJoin(users, eq(users.id, eventStaffAssignments.userId))
    .leftJoin(roles, eq(roles.id, organizerMembers.roleId))
    .where(and(eq(eventStaffAssignments.accessCodeHash, hashToken(code)), eq(eventStaffAssignments.status, "active"), gt(eventStaffAssignments.expiresAt, new Date()), eq(events.status, "published"), eq(organizerMembers.status, "active"), eq(users.status, "active"), or(eq(organizerMembers.eventScope, "all"), eq(organizerMembers.eventScope, events.slug))))
    .limit(1);
  if (!record?.assignment.expiresAt) return null;

  const roleKey = record.roleKey ?? record.member.role;
  const grants = roleKey === "owner" || !record.member.roleId
    ? []
    : await db.select({ permission: rolePermissions.permissionKey }).from(rolePermissions).where(eq(rolePermissions.roleId, record.member.roleId));
  const overrides = await db.select({ permission: memberPermissionOverrides.permissionKey, effect: memberPermissionOverrides.effect })
    .from(memberPermissionOverrides)
    .where(and(eq(memberPermissionOverrides.organizerId, record.assignment.organizerId), eq(memberPermissionOverrides.userId, record.assignment.userId)));
  const permissions = new Set<string>(roleKey === "owner" ? ["*"] : grants.map(({ permission }) => permission));
  for (const override of overrides) {
    if (override.effect === "deny") permissions.delete(override.permission);
    if (override.effect === "allow") permissions.add(override.permission);
  }
  if (!permissions.has("*") && !permissions.has("checkin.operate")) return null;

  return {
    userId: record.user.id,
    email: record.user.email,
    name: `${record.user.firstName} ${record.user.lastName}`.trim(),
    organizerId: record.assignment.organizerId,
    role: roleKey,
    roleId: record.member.roleId,
    eventScope: record.event.slug,
    permissions,
    eventSlug: record.event.slug,
    expiresAt: record.assignment.expiresAt,
  };
}

export async function requireCheckInPermission(permission: PermissionKey) {
  const staffPrincipal = await getEventStaffCodePrincipal();
  if (staffPrincipal && (staffPrincipal.permissions.has("*") || staffPrincipal.permissions.has(permission))) return staffPrincipal;
  const signedInPrincipal = await requirePermission(permission);
  return signedInPrincipal;
}

export async function hasEventStaffCode(principal: WorkspacePrincipal, eventSlug: string) {
  const staffPrincipal = await getEventStaffCodePrincipal();
  return Boolean(staffPrincipal && staffPrincipal.userId === principal.userId && staffPrincipal.organizerId === principal.organizerId && staffPrincipal.eventSlug === eventSlug);
}
