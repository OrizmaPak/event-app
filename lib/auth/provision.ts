import { permissions, rolePermissions, roles } from "@/db/schema";
import type { getDatabase } from "@/lib/db/client";
import { builtInRoles, permissionCatalog } from "./permissions";

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

export async function provisionRoles(tx: Transaction, organizerId: string) {
  await tx.insert(permissions).values(permissionCatalog.map(([key, group, label]) => ({ key, group, label }))).onConflictDoNothing();
  const createdRoles: Record<string, string> = {};
  for (const [key, grants] of Object.entries(builtInRoles)) {
    const [role] = await tx.insert(roles).values({ organizerId, key, name: key.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "), system: true }).returning({ id: roles.id }).onConflictDoUpdate({ target: [roles.organizerId, roles.key], set: { status: "active", updatedAt: new Date() } });
    createdRoles[key] = role.id;
    if (grants.length) await tx.insert(rolePermissions).values(grants.map((permissionKey) => ({ roleId: role.id, permissionKey }))).onConflictDoNothing();
  }
  return createdRoles;
}
