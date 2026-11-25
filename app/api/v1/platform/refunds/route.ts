import { desc, eq } from "drizzle-orm";
import { bookings, organizers, refundRequests } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const id = requestId(request);
  if (!await requirePlatformRole("super_admin", "finance_admin", "support_admin")) return fail("FORBIDDEN", "Platform access is required.", 403, null, id);
  const rows = await getDatabase().select({ request: refundRequests, organizerName: organizers.name, bookingCode: bookings.code }).from(refundRequests).innerJoin(organizers, eq(organizers.id, refundRequests.organizerId)).innerJoin(bookings, eq(bookings.id, refundRequests.bookingId)).orderBy(desc(refundRequests.createdAt)).limit(200);
  return ok(rows.map(({ request: refund, ...details }) => ({ ...refund, ...details })), 200, id);
}
