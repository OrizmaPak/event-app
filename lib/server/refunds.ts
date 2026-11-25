import { and, eq, inArray, sql } from "drizzle-orm";
import { bookingAttendees, bookings, ledgerEntries, paymentTransactions, refundRequests, refunds, seats, ticketCategories } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { createPaystackRefund } from "@/lib/integrations/paystack";

export async function settleApprovedRefund(refundRequestId: string) {
  const db = getDatabase();
  const [record] = await db.select({ refund: refunds, request: refundRequests, payment: paymentTransactions }).from(refunds).innerJoin(refundRequests, eq(refundRequests.id, refunds.refundRequestId)).innerJoin(paymentTransactions, eq(paymentTransactions.id, refunds.paymentTransactionId)).where(eq(refunds.refundRequestId, refundRequestId)).limit(1);
  if (!record) throw new Error("Refund record not found");
  if (record.refund.status === "processed") return;

  const provider = record.payment.provider === "mock"
    ? { providerReference: `mock-refund:${record.refund.id}`, status: "processed" }
    : await createPaystackRefund({ transactionReference: record.payment.providerReference, amountMinor: record.refund.amountMinor });

  await db.transaction(async (tx) => {
    await tx.update(refunds).set({ status: "processed", providerReference: provider.providerReference, processedAt: new Date(), failureReason: null }).where(eq(refunds.id, record.refund.id));
    await tx.update(refundRequests).set({ status: "completed", updatedAt: new Date() }).where(eq(refundRequests.id, record.request.id));
    await tx.insert(ledgerEntries).values([
      { organizerId: record.request.organizerId, bookingId: record.request.bookingId, paymentTransactionId: record.payment.id, account: "organizer_payable", direction: "debit", amountMinor: record.refund.amountMinor, currency: record.payment.currency, description: `Refund for booking ${record.request.bookingId}`, idempotencyKey: `${record.refund.id}:organizer-reversal` },
      { organizerId: record.request.organizerId, bookingId: record.request.bookingId, paymentTransactionId: record.payment.id, account: "cash_clearing", direction: "credit", amountMinor: record.refund.amountMinor, currency: record.payment.currency, description: `Refund settlement ${provider.providerReference}`, idempotencyKey: `${record.refund.id}:cash-reversal` },
    ]).onConflictDoNothing();

    // Partial refunds retain admission. Fully refunded tickets are voided and their inventory is restored once.
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, record.request.bookingId)).for("update").limit(1);
    const completedRefunds = await tx.select({ amountMinor: refunds.amountMinor }).from(refunds).innerJoin(refundRequests, eq(refundRequests.id, refunds.refundRequestId)).where(and(eq(refundRequests.bookingId, record.request.bookingId), eq(refunds.status, "processed")));
    const refundedMinor = completedRefunds.reduce((total, item) => total + item.amountMinor, 0);
    if (booking && booking.status === "confirmed" && refundedMinor >= booking.totalMinor) {
      const attendees = await tx.select().from(bookingAttendees).where(eq(bookingAttendees.bookingId, booking.id));
      const seatIds = attendees.flatMap((attendee) => attendee.seatId ? [attendee.seatId] : []);
      if (seatIds.length) await tx.update(seats).set({ status: "available" }).where(and(inArray(seats.id, seatIds), eq(seats.status, "booked")));
      const categoryCounts = new Map<string, number>();
      for (const attendee of attendees) if (attendee.ticketCategoryId) categoryCounts.set(attendee.ticketCategoryId, (categoryCounts.get(attendee.ticketCategoryId) ?? 0) + 1);
      for (const [categoryId, quantity] of categoryCounts) await tx.update(ticketCategories).set({ quantitySold: sql`greatest(0, ${ticketCategories.quantitySold} - ${quantity})` }).where(eq(ticketCategories.id, categoryId));
      await tx.update(bookings).set({ status: "refunded", paymentStatus: "refunded", expiresAt: null, updatedAt: new Date() }).where(eq(bookings.id, booking.id));
    }
  });
}
