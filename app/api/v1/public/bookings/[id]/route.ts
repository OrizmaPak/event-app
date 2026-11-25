import { and, eq } from "drizzle-orm";
import { bookingAttendees, bookings, events, seats } from "@/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { decryptSecret } from "@/lib/security/encryption";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  const token = request.headers.get("x-booking-token")?.trim();
  if (!token) return fail("BOOKING_TOKEN_REQUIRED", "Booking access token is required.", 401, null, id);
  const db = getDatabase();
  const [record] = await db.select({ booking: bookings, event: events }).from(bookings).innerJoin(events, eq(events.id, bookings.eventId)).where(and(eq(bookings.id, (await params).id), eq(bookings.managementTokenHash, hashToken(token)))).limit(1);
  if (!record) return fail("BOOKING_NOT_FOUND", "Booking not found.", 404, null, id);
  const attendees = await db.select({ attendee: bookingAttendees, seatLabel: seats.label }).from(bookingAttendees).leftJoin(seats, eq(seats.id, bookingAttendees.seatId)).where(eq(bookingAttendees.bookingId, record.booking.id));
  return ok({
    id: record.booking.id,
    eventId: record.event.id,
    eventSlug: record.event.slug,
    code: record.booking.code,
    status: record.booking.status,
    paymentStatus: record.booking.paymentStatus,
    buyerName: record.booking.buyerName,
    buyerEmail: record.booking.buyerEmail,
    buyerPhone: record.booking.buyerPhone,
    currency: record.booking.currency,
    subtotalMinor: record.booking.subtotalMinor,
    feesMinor: record.booking.feesMinor,
    totalMinor: record.booking.totalMinor,
    admissionMode: record.event.admissionMode,
    qrToken: record.booking.status === "confirmed" ? decryptSecret(record.booking.qrTokenEncrypted) : null,
    attendees: attendees.map(({ attendee, seatLabel }) => ({ id: attendee.id, name: attendee.name, email: attendee.email, phone: attendee.phone, seatId: attendee.seatId, seatLabel, priceBandName: attendee.priceBandName, priceMinor: attendee.priceMinor })),
    createdAt: record.booking.createdAt,
  }, 200, id);
}
