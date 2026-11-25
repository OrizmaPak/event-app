import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { bookingAttendees, bookings, checkIns, events } from "@/db/schema";
import { requireCheckInPermission } from "@/lib/auth/event-staff-code";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";
import { hasEventStaffCode } from "@/lib/auth/event-staff-code";

export async function POST(request: Request) {
  const id = requestId(request);
  const principal = await requireCheckInPermission("checkin.operate");
  if (!principal) return fail("FORBIDDEN", "You are not assigned to operate check-in.", 403, null, id);
  const parsed = z.object({ bookingId: z.string().uuid(), attendeeIds: z.array(z.string().uuid()).min(1).max(100), entrance: z.string().trim().min(1).max(80), operationId: z.string().trim().min(12).max(120) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Select the attendees who are present.", 400, null, id);
  const db = getDatabase();
  const [record] = await db.select({ booking: bookings, event: events }).from(bookings).innerJoin(events, eq(events.id, bookings.eventId)).where(and(eq(bookings.id, parsed.data.bookingId), eq(events.organizerId, principal.organizerId), eq(bookings.status, "confirmed"))).limit(1);
  if (!record) return fail("BOOKING_NOT_FOUND", "Booking not found for this event.", 404, null, id);
  if (principal.eventScope !== "all" && principal.eventScope !== record.event.slug) return fail("WRONG_EVENT", "You are not assigned to this event.", 403, null, id);
  if (!await hasEventStaffCode(principal, record.event.slug)) return fail("STAFF_CODE_REQUIRED", "Verify your personal staff code before checking guests in.", 401, null, id);
  const attendees = await db.select({ id: bookingAttendees.id }).from(bookingAttendees).where(and(eq(bookingAttendees.bookingId, record.booking.id), inArray(bookingAttendees.id, parsed.data.attendeeIds)));
  if (attendees.length !== new Set(parsed.data.attendeeIds).size) return fail("ATTENDEE_MISMATCH", "One or more attendees do not belong to this booking.", 400, null, id);
  const existing = await db.select({ attendeeId: checkIns.bookingAttendeeId }).from(checkIns).where(and(inArray(checkIns.bookingAttendeeId, attendees.map((attendee) => attendee.id)), isNull(checkIns.reversedAt)));
  const already = new Set(existing.map((entry) => entry.attendeeId));
  const pending = attendees.filter((attendee) => !already.has(attendee.id));
  const inserted = pending.length ? await db.insert(checkIns).values(pending.map((attendee) => ({ bookingAttendeeId: attendee.id, entrance: parsed.data.entrance, staffKey: principal.userId, operationId: `${parsed.data.operationId}:${attendee.id}` }))).onConflictDoNothing().returning({ attendeeId: checkIns.bookingAttendeeId }) : [];
  const admitted = new Set(inserted.map((entry) => entry.attendeeId));
  for (const attendee of pending) if (!admitted.has(attendee.id)) already.add(attendee.id);
  await writeAudit({ organizerId: principal.organizerId, eventId: record.event.id, actorUserId: principal.userId, action: "checkin.confirmed", targetType: "booking", targetId: record.booking.id, requestId: id, metadata: { attendeeIds: pending.map((attendee) => attendee.id), alreadyCheckedIn: [...already], entrance: parsed.data.entrance, operationId: parsed.data.operationId } });
  return ok({ admitted: [...admitted], alreadyAdmitted: [...already] }, 200, id);
}
