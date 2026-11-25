import { eq } from "drizzle-orm";
import { bookingAttendees, bookings, events, ledgerEntries, notificationDeliveries, notifications, paymentTransactions, paymentWebhookEvents, seats } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { verifyPaystackSignature } from "@/lib/integrations/paystack";

export const runtime = "nodejs";

interface PaystackEvent {
  event: string;
  data: { id?: number; reference?: string; amount?: number; fees?: number; status?: string; paid_at?: string };
}

export async function POST(request: Request) {
  const id = requestId(request);
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"))) return fail("INVALID_SIGNATURE", "Invalid webhook signature.", 401, null, id);
  let payload: PaystackEvent;
  try { payload = JSON.parse(raw) as PaystackEvent; } catch { return fail("INVALID_PAYLOAD", "Invalid webhook payload.", 400, null, id); }
  const providerEventId = String(payload.data.id ?? `${payload.event}:${payload.data.reference ?? "unknown"}`);
  const db = getDatabase();
  const [webhook] = await db.insert(paymentWebhookEvents).values({ provider: "paystack", providerEventId, eventType: payload.event, signatureValid: true, payload: payload as unknown as Record<string, unknown> }).onConflictDoNothing().returning();
  if (!webhook) return ok({ received: true, duplicate: true }, 200, id);
  if (!payload.data.reference) {
    await db.update(paymentWebhookEvents).set({ status: "ignored", processedAt: new Date() }).where(eq(paymentWebhookEvents.id, webhook.id));
    return ok({ received: true, ignored: true }, 200, id);
  }
  const [payment] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.providerReference, payload.data.reference)).limit(1);
  if (!payment) {
    await db.update(paymentWebhookEvents).set({ status: "unmatched", processedAt: new Date() }).where(eq(paymentWebhookEvents.id, webhook.id));
    return ok({ received: true, unmatched: true }, 200, id);
  }
  if (payload.event !== "charge.success") {
    await db.update(paymentTransactions).set({ status: payload.data.status ?? "failed", raw: payload as unknown as Record<string, unknown>, updatedAt: new Date() }).where(eq(paymentTransactions.id, payment.id));
    await db.update(paymentWebhookEvents).set({ status: "processed", processedAt: new Date() }).where(eq(paymentWebhookEvents.id, webhook.id));
    return ok({ received: true }, 200, id);
  }
  if (payload.data.amount !== payment.amountMinor) {
    await db.update(paymentWebhookEvents).set({ status: "rejected", error: "Amount mismatch", processedAt: new Date() }).where(eq(paymentWebhookEvents.id, webhook.id));
    return fail("AMOUNT_MISMATCH", "Payment amount does not match the booking.", 409, null, id);
  }
  await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, payment.bookingId)).for("update").limit(1);
    if (!booking || booking.status === "confirmed") return;
    const [event] = await tx.select().from(events).where(eq(events.id, booking.eventId)).limit(1);
    const attendees = await tx.select().from(bookingAttendees).where(eq(bookingAttendees.bookingId, booking.id));
    await tx.update(paymentTransactions).set({ status: "paid", providerFeeMinor: payload.data.fees ?? 0, organizerNetMinor: payment.amountMinor - payment.platformFeeMinor - (payload.data.fees ?? 0), paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : new Date(), raw: payload as unknown as Record<string, unknown>, updatedAt: new Date() }).where(eq(paymentTransactions.id, payment.id));
    await tx.update(bookings).set({ status: "confirmed", paymentStatus: "paid", confirmedAt: new Date(), expiresAt: null, updatedAt: new Date() }).where(eq(bookings.id, booking.id));
    for (const attendee of attendees) {
      if (attendee.seatId) await tx.update(seats).set({ status: "booked" }).where(eq(seats.id, attendee.seatId));
    }
    if (event) await tx.insert(ledgerEntries).values([
      { organizerId: event.organizerId, eventId: event.id, bookingId: booking.id, paymentTransactionId: payment.id, account: "cash_clearing", direction: "debit", amountMinor: payment.amountMinor, currency: booking.currency, description: `Payment ${payment.providerReference}`, idempotencyKey: `${payment.id}:cash` },
      { organizerId: event.organizerId, eventId: event.id, bookingId: booking.id, paymentTransactionId: payment.id, account: "organizer_payable", direction: "credit", amountMinor: payment.amountMinor - payment.platformFeeMinor - (payload.data.fees ?? 0), currency: booking.currency, description: `Organizer proceeds for ${booking.code}`, idempotencyKey: `${payment.id}:organizer` },
      { organizerId: event.organizerId, eventId: event.id, bookingId: booking.id, paymentTransactionId: payment.id, account: "platform_revenue", direction: "credit", amountMinor: payment.platformFeeMinor, currency: booking.currency, description: `Platform fee for ${booking.code}`, idempotencyKey: `${payment.id}:platform` },
      { organizerId: event.organizerId, eventId: event.id, bookingId: booking.id, paymentTransactionId: payment.id, account: "processor_expense", direction: "credit", amountMinor: payload.data.fees ?? 0, currency: booking.currency, description: `Processor fee for ${booking.code}`, idempotencyKey: `${payment.id}:processor` },
    ]).onConflictDoNothing();
    if (event) {
      const [notification] = await tx.insert(notifications).values({ organizerId: event.organizerId, eventId: event.id, type: "booking.confirmed", title: `Booking ${booking.code} paid`, body: `${booking.buyerName} completed payment for ${attendees.length} attendee${attendees.length === 1 ? "" : "s"}.`, data: { bookingId: booking.id } }).returning({ id: notifications.id });
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
      await tx.insert(notificationDeliveries).values({ notificationId: notification.id, channel: "email", recipient: booking.buyerEmail, subject: `Your pass for ${event.title}`, content: `Hello ${booking.buyerName}, payment is complete and booking ${booking.code} is confirmed. Open your reusable group pass for ${event.title}: ${origin}/guest-pass/${encodeURIComponent(booking.code)}`, status: "queued" });
    }
    await tx.update(paymentWebhookEvents).set({ status: "processed", processedAt: new Date() }).where(eq(paymentWebhookEvents.id, webhook.id));
  }, { isolationLevel: "serializable" });
  return ok({ received: true }, 200, id);
}
