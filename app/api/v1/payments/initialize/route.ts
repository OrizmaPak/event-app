import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { bookings, events, paymentTransactions } from "@/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { initializePaystack } from "@/lib/integrations/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const id = requestId(request);
  const parsed = z.object({ bookingId: z.string().uuid(), managementToken: z.string().min(20) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Booking details are invalid.", 400, null, id);
  const [record] = await getDatabase().select({ booking: bookings, event: events }).from(bookings).innerJoin(events, eq(events.id, bookings.eventId)).where(and(eq(bookings.id, parsed.data.bookingId), eq(bookings.managementTokenHash, hashToken(parsed.data.managementToken)), eq(bookings.status, "awaiting_payment"), gt(bookings.expiresAt, new Date()))).limit(1);
  if (!record) return fail("BOOKING_EXPIRED", "This booking is unavailable or has expired.", 409, null, id);
  const reference = `NASA-${record.booking.id.replace(/-/g, "").slice(0, 18)}-${Date.now()}`;
  let initialized;
  try { initialized = await initializePaystack({ email: record.booking.buyerEmail, amountMinor: record.booking.totalMinor, reference, callbackUrl: `${new URL(request.url).origin}/events/${record.event.slug}/rsvp?payment=return&booking=${record.booking.id}`, metadata: { bookingId: record.booking.id, eventId: record.event.id } }); }
  catch { return fail("PAYMENT_PROVIDER_UNAVAILABLE", "Payment could not be started. Please try again.", 503, null, id); }
  await getDatabase().insert(paymentTransactions).values({ bookingId: record.booking.id, providerReference: initialized.reference, amountMinor: record.booking.totalMinor, currency: record.booking.currency, platformFeeMinor: record.booking.platformFeeMinor, organizerNetMinor: record.booking.totalMinor - record.booking.platformFeeMinor, status: "pending" }).onConflictDoNothing();
  return ok({ authorizationUrl: initialized.authorization_url, reference: initialized.reference }, 201, id);
}
