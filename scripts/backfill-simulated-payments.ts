import { loadEnvFile } from "node:process";
import { eq, inArray } from "drizzle-orm";
import { bookings, paymentTransactions } from "../db/schema";
import { getDatabase } from "../lib/db/client";

loadEnvFile(".env.local");

const db = getDatabase();
const confirmed = await db.select().from(bookings).where(eq(bookings.status, "confirmed"));
const bookingIds = confirmed.map((booking) => booking.id);
const existing = bookingIds.length ? await db.select({ bookingId: paymentTransactions.bookingId }).from(paymentTransactions).where(inArray(paymentTransactions.bookingId, bookingIds)) : [];
const recorded = new Set(existing.map((transaction) => transaction.bookingId));
const missing = confirmed.filter((booking) => booking.paymentStatus === "paid" && booking.totalMinor > 0 && !recorded.has(booking.id));

if (missing.length) {
  await db.insert(paymentTransactions).values(missing.map((booking) => ({
    bookingId: booking.id,
    provider: "mock",
    providerReference: `mock:${booking.id}`,
    type: "charge",
    status: "paid",
    amountMinor: booking.totalMinor,
    currency: booking.currency,
    platformFeeMinor: booking.platformFeeMinor,
    organizerNetMinor: booking.totalMinor - booking.platformFeeMinor,
    paidAt: booking.confirmedAt ?? new Date(),
    raw: { outcome: "simulated_success", restored: true },
  })));
}

console.log(`Created ${missing.length} missing simulated payment transaction${missing.length === 1 ? "" : "s"}.`);
