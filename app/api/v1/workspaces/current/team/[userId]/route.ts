import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { eventStaffAssignments, memberPermissionOverrides, organizerMembers, roles } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { permissionCatalog } from "@/lib/auth/permissions";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

const schema = z.object({ roleId: z.string().uuid(), eventScope: z.string().trim().min(1).max(200), status: z.enum(["active", "suspended"]), overrides: z.array(z.object({ permissionKey: z.string(), effect: z.enum(["allow", "deny"]) })).default([]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const id = requestId(request);
  const principal = await requirePermission("team.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to manage team members.", 403, null, id);
  const targetUserId = (await params).userId;
  if (targetUserId === principal.userId) return fail("SELF_CHANGE_BLOCKED", "Ask another owner to change your access.", 409, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Check the member access settings.", 400, null, id);
  const db = getDatabase();
  const [member] = await db.select().from(organizerMembers).where(and(eq(organizerMembers.organizerId, principal.organizerId), eq(organizerMembers.userId, targetUserId))).limit(1);
  if (!member) return fail("MEMBER_NOT_FOUND", "Team member not found.", 404, null, id);
  if (member.role === "owner") return fail("OWNER_LOCKED", "Transfer ownership before changing this owner.", 409, null, id);
  const [role] = await db.select().from(roles).where(and(eq(roles.id, parsed.data.roleId), eq(roles.organizerId, principal.organizerId), eq(roles.status, "active"))).limit(1);
  if (!role || role.key === "owner") return fail("INVALID_ROLE", "Choose a valid non-owner role.", 400, null, id);
  const validKeys = new Set(permissionCatalog.map(([key]) => key));
  const overrides = parsed.data.overrides.filter((override) => validKeys.has(override.permissionKey as never));
  await db.transaction(async (tx) => {
    await tx.update(organizerMembers).set({ role: role.key, roleId: role.id, eventScope: parsed.data.eventScope, status: parsed.data.status }).where(and(eq(organizerMembers.organizerId, principal.organizerId), eq(organizerMembers.userId, targetUserId)));
    await tx.delete(memberPermissionOverrides).where(and(eq(memberPermissionOverrides.organizerId, principal.organizerId), eq(memberPermissionOverrides.userId, targetUserId)));
    if (overrides.length) await tx.insert(memberPermissionOverrides).values(overrides.map((override) => ({ organizerId: principal.organizerId, userId: targetUserId, permissionKey: override.permissionKey, effect: override.effect })));
  });
  await writeAudit({ organizerId: principal.organizerId, actorUserId: principal.userId, action: "member.access_updated", targetType: "user", targetId: targetUserId, requestId: id, metadata: { role: role.key, eventScope: parsed.data.eventScope, status: parsed.data.status, overrides } });
  return ok({ updated: true }, 200, id);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const id = requestId(request);
  const principal = await requirePermission("team.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to remove team members.", 403, null, id);
  const targetUserId = (await params).userId;
  if (targetUserId === principal.userId) return fail("SELF_CHANGE_BLOCKED", "Ask another owner to remove your access.", 409, null, id);
  const db = getDatabase();
  const [member] = await db.select({ userId: organizerMembers.userId, email: organizerMembers.email, role: organizerMembers.role }).from(organizerMembers).where(and(eq(organizerMembers.organizerId, principal.organizerId), eq(organizerMembers.userId, targetUserId))).limit(1);
  if (!member) return fail("MEMBER_NOT_FOUND", "Team member not found.", 404, null, id);
  if (member.role === "owner") return fail("OWNER_LOCKED", "Transfer ownership before removing this owner.", 409, null, id);
  await db.transaction(async (tx) => {
    await tx.delete(eventStaffAssignments).where(and(eq(eventStaffAssignments.organizerId, principal.organizerId), eq(eventStaffAssignments.userId, targetUserId)));
    await tx.delete(memberPermissionOverrides).where(and(eq(memberPermissionOverrides.organizerId, principal.organizerId), eq(memberPermissionOverrides.userId, targetUserId)));
    await tx.delete(organizerMembers).where(and(eq(organizerMembers.organizerId, principal.organizerId), eq(organizerMembers.userId, targetUserId)));
  });
  await writeAudit({ organizerId: principal.organizerId, actorUserId: principal.userId, action: "member.removed", targetType: "user", targetId: targetUserId, requestId: id, metadata: { email: member.email } });
  return ok({ removed: true }, 200, id);
}
