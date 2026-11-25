import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { cache } from "react";
import { memberPermissionOverrides, mfaFactors, organizerMembers, organizers, platformMembers, rolePermissions, roles } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { getCurrentUser } from "./session";
import type { PermissionKey } from "./permissions";

export interface WorkspacePrincipal {
  userId: string;
  email: string;
  name: string;
  organizerId: string;
  role: string;
  roleId: string | null;
  eventScope: string;
  permissions: Set<string>;
}

export const getWorkspacePrincipal = cache(async function getWorkspacePrincipal(organizerId?: string): Promise<WorkspacePrincipal | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const db = getDatabase();
  const members = await db.select({ member: organizerMembers, roleKey: roles.key, organizerStatus: organizers.status })
    .from(organizerMembers)
    .leftJoin(roles, eq(roles.id, organizerMembers.roleId))
    .innerJoin(organizers, eq(organizers.id, organizerMembers.organizerId))
    .where(and(eq(organizerMembers.userId, current.user.id), eq(organizerMembers.status, "active")));
  const selected = organizerId ? members.find(({ member, organizerStatus }) => member.organizerId === organizerId && organizerStatus === "active") : members.find(({ organizerStatus }) => organizerStatus === "active");
  if (!selected) return null;

  const roleKey = selected.roleKey ?? selected.member.role;
  if (roleKey === "owner") {
    return {
      userId: current.user.id,
      email: current.user.email,
      name: `${current.user.firstName} ${current.user.lastName}`.trim(),
      organizerId: selected.member.organizerId,
      role: roleKey,
      roleId: selected.member.roleId,
      eventScope: selected.member.eventScope,
      permissions: new Set(["*"]),
    };
  }

  const grants = selected.member.roleId
    ? await db.select({ key: rolePermissions.permissionKey }).from(rolePermissions).where(eq(rolePermissions.roleId, selected.member.roleId))
    : [];
  const overrides = await db.select({ key: memberPermissionOverrides.permissionKey, effect: memberPermissionOverrides.effect })
    .from(memberPermissionOverrides)
    .where(and(eq(memberPermissionOverrides.organizerId, selected.member.organizerId), eq(memberPermissionOverrides.userId, current.user.id)));
  const effective = new Set(grants.map(({ key }) => key));
  for (const override of overrides) {
    if (override.effect === "deny") effective.delete(override.key);
    if (override.effect === "allow") effective.add(override.key);
  }
  return {
    userId: current.user.id,
    email: current.user.email,
    name: `${current.user.firstName} ${current.user.lastName}`.trim(),
    organizerId: selected.member.organizerId,
    role: roleKey,
    roleId: selected.member.roleId,
    eventScope: selected.member.eventScope,
    permissions: effective,
  };
});

export async function getOrganizerAccessState(): Promise<"none" | "active" | "pending" | "blocked"> {
  const current = await getCurrentUser();
  if (!current) return "none";
  const memberships = await getDatabase()
    .select({ memberStatus: organizerMembers.status, organizerStatus: organizers.status })
    .from(organizerMembers)
    .innerJoin(organizers, eq(organizers.id, organizerMembers.organizerId))
    .where(eq(organizerMembers.userId, current.user.id));
  if (memberships.some(({ memberStatus, organizerStatus }) => memberStatus === "active" && organizerStatus === "active")) return "active";
  if (memberships.some(({ organizerStatus }) => organizerStatus === "pending")) return "pending";
  if (memberships.some(({ organizerStatus }) => organizerStatus === "blocked")) return "blocked";
  return "none";
}

export function hasPermission(principal: WorkspacePrincipal, permission: PermissionKey) {
  return principal.permissions.has("*") || principal.permissions.has(permission);
}

export async function requirePermission(permission: PermissionKey, organizerId?: string) {
  const principal = await getWorkspacePrincipal(organizerId);
  if (!principal || !hasPermission(principal, permission)) return null;
  return principal;
}

export const getPlatformPrincipal = cache(async function getPlatformPrincipal() {
  const current = await getCurrentUser();
  if (!current) return null;
  const [membership] = await getDatabase().select().from(platformMembers).where(and(eq(platformMembers.userId, current.user.id), eq(platformMembers.status, "active"))).limit(1);
  if (!membership) return null;
  const [factor] = await getDatabase().select({ id: mfaFactors.id }).from(mfaFactors).where(and(eq(mfaFactors.userId, current.user.id), isNotNull(mfaFactors.verifiedAt), isNull(mfaFactors.disabledAt))).limit(1);
  return { user: current.user, role: membership.role, mfaEnabled: Boolean(factor) };
});

export async function requirePlatformRole(...rolesAllowed: string[]) {
  const principal = await getPlatformPrincipal();
  const mfaRequired = process.env.PLATFORM_MFA_REQUIRED !== "false";
  return principal && (!mfaRequired || principal.mfaEnabled) && rolesAllowed.includes(principal.role) ? principal : null;
}
