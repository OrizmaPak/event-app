import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { bookingAttendees, bookings, checkIns, events, seats } from "@/db/schema";
import { hasEventStaffCode, requireCheckInPermission } from "@/lib/auth/event-staff-code";
import { hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function POST(request: Request) {
  const id = requestId(request);
  const principal = await requireCheckInPermission("checkin.operate");
  if (!principal) return fail("FORBIDDEN", "You are not assigned to operate check-in.", 403, null, id);
  const parsed = z.object({ qrToken: z.string().min(20), eventSlug: z.string().min(1).optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("INVALID_PASS", "This pass could not be read.", 400, null, id);
  const db = getDatabase();
  const [record] = await db.select({ booking: bookings, event: events }).from(bookings).innerJoin(events, eq(events.id, bookings.eventId)).where(and(eq(bookings.qrTokenHash, hashToken(parsed.data.qrToken)), eq(events.organizerId, principal.organizerId))).limit(1);
  if (!record || record.booking.status !== "confirmed") return fail("INVALID_PASS", "This pass is invalid, unpaid, cancelled or for another event.", 404, null, id);
  if (parsed.data.eventSlug && record.event.slug !== parsed.data.eventSlug) return fail("WRONG_EVENT", "This pass belongs to a different event.", 403, null, id);
  if (principal.eventScope !== "all" && principal.eventScope !== record.event.slug) return fail("WRONG_EVENT", "You are not assigned to this event.", 403, null, id);
  if (!await hasEventStaffCode(principal, record.event.slug)) return fail("STAFF_CODE_REQUIRED", "Verify your personal staff code before scanning passes.", 401, null, id);
  const attendees = await db.select({ attendee: bookingAttendees, seatLabel: seats.label }).from(bookingAttendees).leftJoin(seats, eq(seats.id, bookingAttendees.seatId)).where(eq(bookingAttendees.bookingId, record.booking.id));
  const entries = attendees.length ? await db.select().from(checkIns).where(and(inArray(checkIns.bookingAttendeeId, attendees.map(({ attendee }) => attendee.id)), isNull(checkIns.reversedAt))) : [];
  return ok({ booking: { id: record.booking.id, code: record.booking.code, buyerName: record.booking.buyerName, eventTitle: record.event.title }, attendees: attendees.map(({ attendee, seatLabel }) => ({ ...attendee, seatLabel, checkIn: entries.find((entry) => entry.bookingAttendeeId === attendee.id) ?? null })) }, 200, id);
}
