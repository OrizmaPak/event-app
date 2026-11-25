import { and, eq, gt } from "drizzle-orm";
import { bookingAttendees, bookings, events, notificationDeliveries, notifications, paymentTransactions, seats } from "@/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function POST(request: Request) {
  const id = requestId(request);
  if (process.env.NODE_ENV === "production") return fail("NOT_FOUND", "Not found.", 404, null, id);
  const body = await request.json().catch(() => null) as { bookingId?: string; managementToken?: string; outcome?: string } | null;
  if (!body?.bookingId || !body.managementToken) return fail("VALIDATION_ERROR", "Booking details are required.", 400, null, id);
  if (body.outcome === "declined") return fail("PAYMENT_DECLINED", "The simulated payment was declined.", 402, null, id);
  const db = getDatabase();
  try {
    await db.transaction(async (tx) => {
      const [booking] = await tx.select().from(bookings).where(and(eq(bookings.id, body.bookingId!), eq(bookings.managementTokenHash, hashToken(body.managementToken!)), eq(bookings.status, "awaiting_payment"), gt(bookings.expiresAt, new Date()))).for("update").limit(1);
      if (!booking) throw new Error("BOOKING_EXPIRED");
      const attendees = await tx.select().from(bookingAttendees).where(eq(bookingAttendees.bookingId, booking.id));
      const [event] = await tx.select().from(events).where(eq(events.id, booking.eventId)).limit(1);
      for (const attendee of attendees) if (attendee.seatId) await tx.update(seats).set({ status: "booked" }).where(eq(seats.id, attendee.seatId));
      await tx.update(bookings).set({ status: "confirmed", paymentStatus: "paid", confirmedAt: new Date(), expiresAt: null, updatedAt: new Date() }).where(eq(bookings.id, booking.id));
      await tx.insert(paymentTransactions).values({
        bookingId: booking.id,
        provider: "mock",
        providerReference: `mock:${booking.id}`,
        type: "charge",
        status: "paid",
        amountMinor: booking.totalMinor,
        currency: booking.currency,
        platformFeeMinor: booking.platformFeeMinor,
        organizerNetMinor: booking.totalMinor - booking.platformFeeMinor,
        paidAt: new Date(),
        raw: { outcome: "simulated_success" },
      }).onConflictDoUpdate({
        target: [paymentTransactions.provider, paymentTransactions.providerReference],
        set: { status: "paid", amountMinor: booking.totalMinor, platformFeeMinor: booking.platformFeeMinor, organizerNetMinor: booking.totalMinor - booking.platformFeeMinor, paidAt: new Date(), updatedAt: new Date() },
      });
      if (event) {
        const [notification] = await tx.insert(notifications).values({ organizerId: event.organizerId, eventId: event.id, type: "booking.confirmed", title: `Booking ${booking.code} paid`, body: `${booking.buyerName} completed a simulated payment.`, data: { bookingId: booking.id } }).returning({ id: notifications.id });
        const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
        await tx.insert(notificationDeliveries).values({ notificationId: notification.id, channel: "email", recipient: booking.buyerEmail, subject: `Your pass for ${event.title}`, content: `Hello ${booking.buyerName}, booking ${booking.code} is confirmed. Open your reusable group pass for ${event.title}: ${origin}/guest-pass/${encodeURIComponent(booking.code)}`, status: "queued" });
      }
    });
    return ok({ confirmed: true }, 200, id);
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_EXPIRED") return fail("BOOKING_EXPIRED", "This booking has expired.", 409, null, id);
    throw error;
  }
}
