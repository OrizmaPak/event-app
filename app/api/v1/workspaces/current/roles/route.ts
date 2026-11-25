import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { rolePermissions, roles } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { permissionCatalog } from "@/lib/auth/permissions";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

const inputSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2).max(80), description: z.string().trim().max(240).default(""), permissions: z.array(z.string()).default([]) });

export async function GET() {
  const principal = await requirePermission("team.view");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to view team roles.", 403);
  const db = getDatabase();
  const roleRows = await db.select().from(roles).where(and(eq(roles.organizerId, principal.organizerId), eq(roles.status, "active")));
  const grants = roleRows.length ? await db.select().from(rolePermissions).where(inArray(rolePermissions.roleId, roleRows.map((role) => role.id))) : [];
  return ok({ roles: roleRows.map((role) => ({ ...role, permissions: grants.filter((grant) => grant.roleId === role.id).map((grant) => grant.permissionKey) })), catalog: permissionCatalog.map(([key, group, label]) => ({ key, group, label })) });
}

export async function POST(request: Request) {
  const id = requestId(request);
  const principal = await requirePermission("roles.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to manage roles.", 403, null, id);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Check the role details.", 400, null, id);
  const validKeys = new Set(permissionCatalog.map(([key]) => key));
  const grants = [...new Set(parsed.data.permissions.filter((key) => validKeys.has(key as never)))];
  const db = getDatabase();
  const role = await db.transaction(async (tx) => {
    const key = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}_${crypto.randomUUID().slice(0, 6)}`;
    const [created] = await tx.insert(roles).values({ organizerId: principal.organizerId, key, name: parsed.data.name, description: parsed.data.description, system: false }).returning();
    if (grants.length) await tx.insert(rolePermissions).values(grants.map((permissionKey) => ({ roleId: created.id, permissionKey })));
    return created;
  });
  await writeAudit({ organizerId: principal.organizerId, actorUserId: principal.userId, action: "role.created", targetType: "role", targetId: role.id, requestId: id, metadata: { name: role.name, permissions: grants } });
  return ok({ role: { ...role, permissions: grants } }, 201, id);
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  const principal = await requirePermission("roles.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to manage roles.", 403, null, id);
  const parsed = inputSchema.extend({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Check the role details.", 400, null, id);
  const db = getDatabase();
  const [role] = await db.select().from(roles).where(and(eq(roles.id, parsed.data.id), eq(roles.organizerId, principal.organizerId))).limit(1);
  if (!role) return fail("ROLE_NOT_FOUND", "Role not found.", 404, null, id);
  if (role.key === "owner") return fail("OWNER_ROLE_LOCKED", "The Owner role cannot be changed.", 409, null, id);
  const validKeys = new Set(permissionCatalog.map(([key]) => key));
  const grants = [...new Set(parsed.data.permissions.filter((key) => validKeys.has(key as never)))];
  await db.transaction(async (tx) => {
    await tx.update(roles).set({ name: parsed.data.name, description: parsed.data.description, updatedAt: new Date() }).where(eq(roles.id, role.id));
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    if (grants.length) await tx.insert(rolePermissions).values(grants.map((permissionKey) => ({ roleId: role.id, permissionKey })));
  });
  await writeAudit({ organizerId: principal.organizerId, actorUserId: principal.userId, action: "role.updated", targetType: "role", targetId: role.id, requestId: id, metadata: { name: parsed.data.name, permissions: grants } });
  return ok({ role: { ...role, name: parsed.data.name, description: parsed.data.description, permissions: grants } }, 200, id);
}
