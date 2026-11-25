import { and, eq, isNull } from "drizzle-orm";
import { bookingAttendees, bookings, checkIns, events, layoutObjects, seats } from "@/db/schema";
import { hasEventStaffCode, requireCheckInPermission } from "@/lib/auth/event-staff-code";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const id = requestId(request);
  const principal = await requireCheckInPermission("checkin.operate");
  if (!principal) return fail("FORBIDDEN", "You are not assigned to operate check-in.", 403, null, id);
  const eventSlug = new URL(request.url).searchParams.get("eventSlug")?.trim() ?? "";
  if (!eventSlug) return fail("EVENT_REQUIRED", "Choose an event to load its roster.", 400, null, id);
  if (principal.eventScope !== "all" && principal.eventScope !== eventSlug) return fail("WRONG_EVENT", "You are not assigned to this event.", 403, null, id);
  if (!await hasEventStaffCode(principal, eventSlug)) return fail("STAFF_CODE_REQUIRED", "Verify your personal staff code before loading the roster.", 401, null, id);

  const db = getDatabase();
  const [event] = await db.select({ id: events.id, title: events.title }).from(events).where(and(eq(events.slug, eventSlug), eq(events.organizerId, principal.organizerId))).limit(1);
  if (!event) return fail("EVENT_NOT_FOUND", "Event not found in this workspace.", 404, null, id);
  const rows = await db.select({ attendee: bookingAttendees, booking: bookings, checkIn: checkIns, seat: seats, table: layoutObjects })
    .from(bookingAttendees)
    .innerJoin(bookings, eq(bookings.id, bookingAttendees.bookingId))
    .leftJoin(checkIns, and(eq(checkIns.bookingAttendeeId, bookingAttendees.id), isNull(checkIns.reversedAt)))
    .leftJoin(seats, eq(seats.id, bookingAttendees.seatId))
    .leftJoin(layoutObjects, eq(layoutObjects.id, seats.layoutObjectId))
    .where(and(eq(bookings.eventId, event.id), eq(bookings.status, "confirmed")))
    .limit(2000);
  const response = ok({ event: { id: event.id, title: event.title, slug: eventSlug }, guests: rows.map(({ attendee, booking, checkIn, seat, table }) => ({
    id: attendee.id,
    eventId: event.id,
    name: attendee.name,
    email: attendee.email,
    phone: attendee.phone ?? "",
    rsvp: "confirmed",
    checkIn: checkIn ? "checked-in" : "not-checked-in",
    table: table?.label ?? null,
    seat: seat?.shortLabel ?? null,
    partySize: 1,
    passCode: booking.code,
    invitedAt: booking.createdAt.toISOString(),
    checkedInAt: checkIn?.checkedInAt?.toISOString(),
  })) }, 200, id);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
