import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { bookingAttendees, bookings, checkIns, events, seats } from "@/db/schema";
import { hasEventStaffCode, requireCheckInPermission } from "@/lib/auth/event-staff-code";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const id = requestId(request);
  const principal = await requireCheckInPermission("checkin.operate");
  if (!principal) return fail("FORBIDDEN", "You are not assigned to operate check-in.", 403, null, id);
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const eventSlug = url.searchParams.get("eventSlug")?.trim() ?? "";
  if (query.length < 2 || !eventSlug) return ok([], 200, id);
  if (principal.eventScope !== "all" && principal.eventScope !== eventSlug) return fail("WRONG_EVENT", "You are not assigned to this event.", 403, null, id);
  if (!await hasEventStaffCode(principal, eventSlug)) return fail("STAFF_CODE_REQUIRED", "Verify your personal staff code before looking up guests.", 401, null, id);
  const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const db = getDatabase();
  const rows = await db.select({ attendee: bookingAttendees, booking: bookings, event: events, seatLabel: seats.label, checkIn: checkIns }).from(bookingAttendees).innerJoin(bookings, eq(bookings.id, bookingAttendees.bookingId)).innerJoin(events, eq(events.id, bookings.eventId)).leftJoin(seats, eq(seats.id, bookingAttendees.seatId)).leftJoin(checkIns, and(eq(checkIns.bookingAttendeeId, bookingAttendees.id), isNull(checkIns.reversedAt))).where(and(eq(events.organizerId, principal.organizerId), eq(events.slug, eventSlug), eq(bookings.status, "confirmed"), or(ilike(bookings.buyerName, pattern), ilike(bookings.buyerEmail, pattern), ilike(bookings.code, pattern), ilike(bookingAttendees.name, pattern), ilike(bookingAttendees.email, pattern), ilike(bookingAttendees.priceBandName, pattern), ilike(seats.label, pattern)))).limit(50);
  return ok(rows.map(({ attendee, booking, event, seatLabel, checkIn }) => ({ attendee: { ...attendee, seatLabel }, booking: { id: booking.id, code: booking.code, buyerName: booking.buyerName, buyerEmail: booking.buyerEmail }, event: { id: event.id, title: event.title, slug: event.slug }, checkIn })), 200, id);
}
