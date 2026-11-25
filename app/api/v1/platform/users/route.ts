import { desc, eq } from "drizzle-orm";
import { platformMembers, users } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const id = requestId(request);
  if (!await requirePlatformRole("super_admin")) return fail("FORBIDDEN", "Super admin access is required.", 403, null, id);
  const rows = await getDatabase().select({ user: users, platformRole: platformMembers.role }).from(users).leftJoin(platformMembers, eq(platformMembers.userId, users.id)).orderBy(desc(users.createdAt)).limit(200);
  return ok(rows.map(({ user, platformRole }) => ({ ...user, platformRole })), 200, id);
}
