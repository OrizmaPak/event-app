import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { bookingAttendees, bookings, checkIns, events } from "@/db/schema";
import { requireCheckInPermission, hasEventStaffCode } from "@/lib/auth/event-staff-code";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  const principal = await requireCheckInPermission("checkin.supervise");
  if (!principal) return fail("FORBIDDEN", "Supervisor permission is required.", 403, null, id);
  const parsed = z.object({ reason: z.string().trim().min(5).max(240) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Enter a reason for reversing this check-in.", 400, null, id);
  const [record] = await getDatabase().select({ checkIn: checkIns, booking: bookings, event: events }).from(checkIns).innerJoin(bookingAttendees, eq(bookingAttendees.id, checkIns.bookingAttendeeId)).innerJoin(bookings, eq(bookings.id, bookingAttendees.bookingId)).innerJoin(events, eq(events.id, bookings.eventId)).where(and(eq(checkIns.id, (await params).id), eq(events.organizerId, principal.organizerId), isNull(checkIns.reversedAt))).limit(1);
  if (!record) return fail("CHECKIN_NOT_FOUND", "Active check-in not found.", 404, null, id);
  if (!await hasEventStaffCode(principal, record.event.slug)) return fail("STAFF_CODE_REQUIRED", "Verify your personal staff code before managing check-ins.", 401, null, id);
  await getDatabase().update(checkIns).set({ reversedAt: new Date(), reversedBy: principal.userId, reversalReason: parsed.data.reason }).where(eq(checkIns.id, record.checkIn.id));
  await writeAudit({ organizerId: principal.organizerId, eventId: record.event.id, actorUserId: principal.userId, action: "checkin.reversed", targetType: "check_in", targetId: record.checkIn.id, reason: parsed.data.reason, requestId: id });
  return ok({ reversed: true }, 200, id);
}
