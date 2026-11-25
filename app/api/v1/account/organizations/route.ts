import { z } from "zod";
import { organizerMembers, organizers } from "@/db/schema";
import { provisionRoles } from "@/lib/auth/provision";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

const schema = z.object({ name: z.string().trim().min(2).max(120) });

function makeSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "organization";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  const id = requestId(request);
  const current = await getCurrentUser();
  if (!current) return fail("UNAUTHORIZED", "Sign in to create an organization.", 401, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Enter an organization name.", 400, null, id);
  const db = getDatabase();
  const organizer = await db.transaction(async (tx) => {
    const [created] = await tx.insert(organizers).values({ slug: makeSlug(parsed.data.name), name: parsed.data.name, email: current.user.email, status: "pending" }).returning();
    const roleIds = await provisionRoles(tx, created.id);
    await tx.insert(organizerMembers).values({ organizerId: created.id, userKey: current.user.id, userId: current.user.id, email: current.user.email, role: "owner", roleId: roleIds.owner, status: "active", eventScope: "all", acceptedAt: new Date() });
    return created;
  });
  return ok({ organizer }, 201, id);
}
