import { eq } from "drizzle-orm";
import { z } from "zod";
import { bookingAttendees, bookings, eventPages, events, seats } from "@/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

const schema = z.object({ qrToken: z.string().min(20).max(500) });

export async function POST(request: Request) {
  const id = requestId(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("INVALID_PASS", "This pass link is invalid.", 400, null, id);
  const db = getDatabase();
  const [record] = await db.select({ booking: bookings, event: events, page: eventPages.config }).from(bookings).innerJoin(events, eq(events.id, bookings.eventId)).leftJoin(eventPages, eq(eventPages.eventId, events.id)).where(eq(bookings.qrTokenHash, hashToken(parsed.data.qrToken))).limit(1);
  if (!record) return fail("PASS_NOT_FOUND", "This pass is invalid or no longer active.", 404, null, id);
  if (record.booking.status === "refunded" || record.booking.paymentStatus === "refunded") return fail("PASS_REFUNDED", "This ticket has been refunded and is no longer valid.", 410, null, id);
  if (record.booking.status !== "confirmed") return fail("PASS_NOT_FOUND", "This pass is invalid or no longer active.", 404, null, id);
  const attendees = await db.select({ attendee: bookingAttendees, seatLabel: seats.label }).from(bookingAttendees).leftJoin(seats, eq(seats.id, bookingAttendees.seatId)).where(eq(bookingAttendees.bookingId, record.booking.id));
  const hero = record.page?.sections.find((section) => section.type === "hero");
  const bannerUrl = hero?.type === "hero" && hero.media?.src ? hero.media.src : null;
  return ok({ id: record.booking.id, eventId: record.event.id, eventSlug: record.event.slug, eventTitle: record.event.title, eventDate: record.event.startAt, eventVenue: record.event.venue, bannerUrl, code: record.booking.code, qrToken: parsed.data.qrToken, buyerName: record.booking.buyerName, buyerEmail: record.booking.buyerEmail, buyerPhone: record.booking.buyerPhone, currency: record.booking.currency, admissionMode: record.event.admissionMode, subtotalMinor: record.booking.subtotalMinor, feesMinor: record.booking.feesMinor, totalMinor: record.booking.totalMinor, paymentStatus: record.booking.paymentStatus, createdAt: record.booking.createdAt, attendees: attendees.map(({ attendee, seatLabel }) => ({ id: attendee.id, name: attendee.name, email: attendee.email, phone: attendee.phone, seatId: attendee.seatId, seatLabel, priceBandName: attendee.priceBandName, priceMinor: attendee.priceMinor })) }, 200, id);
}
