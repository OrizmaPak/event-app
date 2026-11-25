import { count, desc, eq } from "drizzle-orm";
import { events, organizers } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const id = requestId(request);
  if (!await requirePlatformRole("super_admin")) return fail("FORBIDDEN", "Super admin access is required.", 403, null, id);
  const rows = await getDatabase().select({ organizer: organizers, eventCount: count(events.id) }).from(organizers).leftJoin(events, eq(events.organizerId, organizers.id)).groupBy(organizers.id).orderBy(desc(organizers.createdAt)).limit(200);
  return ok(rows.map(({ organizer, eventCount }) => ({ ...organizer, eventCount })), 200, id);
}
