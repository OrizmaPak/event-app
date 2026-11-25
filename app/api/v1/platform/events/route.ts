import { desc, eq } from "drizzle-orm";
import { events, organizers } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const id = requestId(request);
  if (!await requirePlatformRole("super_admin")) return fail("FORBIDDEN", "Super admin access is required.", 403, null, id);
  const rows = await getDatabase().select({ event: events, organizerName: organizers.name, organizerEmail: organizers.email }).from(events).innerJoin(organizers, eq(organizers.id, events.organizerId)).orderBy(desc(events.createdAt)).limit(200);
  return ok(rows.map(({ event, ...details }) => ({ ...event, ...details })), 200, id);
}
