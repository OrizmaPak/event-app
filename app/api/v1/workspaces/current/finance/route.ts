import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { bookings, events, paymentTransactions, payouts, refundRequests } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { requirePermission } from "@/lib/auth/policy";
import { loadEventRevenue } from "@/lib/server/event-analytics";

export async function GET(request: Request) {
  const id = requestId(request);
  const principal = await requirePermission("finance.view");
  if (!principal) return fail("FORBIDDEN", "You do not have access to finance.", 403, null, id);
  const db = getDatabase();
  const eventRows = await db.select({ id: events.id, title: events.title, slug: events.slug, currency: events.currency }).from(events).where(and(eq(events.organizerId, principal.organizerId), principal.eventScope === "all" ? undefined : eq(events.slug, principal.eventScope)));
  const eventIds = eventRows.map((event) => event.id);
  if (!eventIds.length) return ok({ summary: { grossMinor: 0, platformFeesMinor: 0, processorFeesMinor: 0, organizerNetMinor: 0, paidOutMinor: 0 }, summaryByCurrency: [], eventRevenue: [], transactions: [], refunds: [], payouts: [], payoutBalanceAvailable: principal.eventScope === "all" }, 200, id);
  const [transactions, requests, payoutRows, totals, payoutTotals, eventRevenue] = await Promise.all([
    db.select({ payment: paymentTransactions, bookingCode: bookings.code, eventTitle: events.title }).from(paymentTransactions).innerJoin(bookings, eq(bookings.id, paymentTransactions.bookingId)).innerJoin(events, eq(events.id, bookings.eventId)).where(inArray(events.id, eventIds)).orderBy(desc(paymentTransactions.createdAt)).limit(100),
    db.select({ request: refundRequests, bookingCode: bookings.code, eventTitle: events.title }).from(refundRequests).innerJoin(bookings, eq(bookings.id, refundRequests.bookingId)).innerJoin(events, eq(events.id, bookings.eventId)).where(and(eq(refundRequests.organizerId, principal.organizerId), inArray(events.id, eventIds))).orderBy(desc(refundRequests.createdAt)).limit(100),
    principal.eventScope === "all" ? db.select().from(payouts).where(eq(payouts.organizerId, principal.organizerId)).orderBy(desc(payouts.createdAt)).limit(100) : Promise.resolve([]),
    db.select({ currency: paymentTransactions.currency, grossMinor: sql<number>`coalesce(sum(${paymentTransactions.amountMinor}), 0)`.mapWith(Number), platformFeesMinor: sql<number>`coalesce(sum(${paymentTransactions.platformFeeMinor}), 0)`.mapWith(Number), processorFeesMinor: sql<number>`coalesce(sum(${paymentTransactions.providerFeeMinor}), 0)`.mapWith(Number), organizerNetMinor: sql<number>`coalesce(sum(${paymentTransactions.organizerNetMinor}), 0)`.mapWith(Number) }).from(paymentTransactions).innerJoin(bookings, eq(bookings.id, paymentTransactions.bookingId)).where(and(inArray(bookings.eventId, eventIds), eq(paymentTransactions.status, "paid"), eq(paymentTransactions.type, "charge"))).groupBy(paymentTransactions.currency),
    principal.eventScope === "all" ? db.select({ currency: payouts.currency, paidOutMinor: sql<number>`coalesce(sum(${payouts.amountMinor}), 0)`.mapWith(Number) }).from(payouts).where(and(eq(payouts.organizerId, principal.organizerId), eq(payouts.status, "paid"))).groupBy(payouts.currency) : Promise.resolve([]),
    loadEventRevenue(eventIds),
  ]);
  const currencies = [...new Set([...eventRows.map((event) => event.currency), ...totals.map((total) => total.currency), ...payoutTotals.map((payout) => payout.currency)])];
  const summaryByCurrency = currencies.map((currency) => ({ ...(totals.find((total) => total.currency === currency) ?? { grossMinor: 0, platformFeesMinor: 0, processorFeesMinor: 0, organizerNetMinor: 0 }), currency, paidOutMinor: payoutTotals.find((total) => total.currency === currency)?.paidOutMinor ?? 0, refundedMinor: eventRevenue.filter((row) => row.currency === currency).reduce((sum, row) => sum + row.refundedMinor, 0) }));
  return ok({
    summary: summaryByCurrency.find((total) => total.currency === "NGN") ?? summaryByCurrency[0],
    summaryByCurrency,
    payoutBalanceAvailable: principal.eventScope === "all",
    eventRevenue: eventRows.map((event) => ({ eventId: event.id, title: event.title, slug: event.slug, currency: event.currency, collectedMinor: eventRevenue.find((row) => row.eventId === event.id && row.currency === event.currency)?.collectedMinor ?? 0, refundedMinor: eventRevenue.find((row) => row.eventId === event.id && row.currency === event.currency)?.refundedMinor ?? 0 })),
    transactions: transactions.map(({ payment, bookingCode, eventTitle }) => ({ ...payment, bookingCode, eventTitle })),
    refunds: requests.map(({ request: refund, bookingCode, eventTitle }) => ({ ...refund, bookingCode, eventTitle })),
    payouts: payoutRows,
  }, 200, id);
}
