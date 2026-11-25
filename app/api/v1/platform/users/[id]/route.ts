import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { getCurrentUser } from "@/lib/auth/session";

const schema = z.object({ firstName: z.string().trim().min(1).max(80).optional(), lastName: z.string().trim().min(1).max(80).optional(), phone: z.string().trim().max(40).optional(), status: z.enum(["active", "suspended", "deactivated"]).optional() }).refine((value) => Object.keys(value).length > 0, "Choose a user update.");

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  const principal = await requirePlatformRole("super_admin");
  if (!principal) return fail("FORBIDDEN", "Super admin access is required.", 403, null, id);
  const targetId = (await params).id;
  const current = await getCurrentUser();
  if (current?.user.id === targetId) return fail("SELF_LOCKOUT", "You cannot deactivate your own super-admin account.", 409, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose a valid user update.", 400, null, id);
  const [updated] = await getDatabase().update(users).set({ ...parsed.data, updatedAt: new Date() }).where(eq(users.id, targetId)).returning();
  return updated ? ok(updated, 200, id) : fail("USER_NOT_FOUND", "User not found.", 404, null, id);
}
