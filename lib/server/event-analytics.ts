import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { bookingAttendees, bookings, checkIns, inventoryHolds, layoutObjects, paymentTransactions, priceBands, seats, ticketCategories, refunds, refundRequests } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { buildEventAnalytics } from "@/lib/data/event-analytics";

export async function loadEventAnalytics(event: { id: string; admissionMode: string; timezone: string }) {
  const db = getDatabase();
  const [eventSeats, categories, eventBookings, attendees, holds] = await Promise.all([
    db.select({ id: seats.id, label: seats.label, status: seats.status, reservedFor: seats.reservedFor, blockedReason: seats.blockedReason, table: layoutObjects.label, band: sql<string>`coalesce(${priceBands.name}, 'Unpriced')`, priceMinor: sql<number>`coalesce(${seats.priceOverrideMinor}, ${priceBands.priceMinor}, 0)` }).from(seats).innerJoin(layoutObjects, eq(layoutObjects.id, seats.layoutObjectId)).leftJoin(priceBands, eq(priceBands.id, seats.priceBandId)).where(eq(seats.eventId, event.id)).orderBy(layoutObjects.sortOrder, seats.label),
    db.select().from(ticketCategories).where(eq(ticketCategories.eventId, event.id)).orderBy(ticketCategories.sortOrder),
    db.select({ id: bookings.id, code: bookings.code, status: bookings.status, paymentStatus: bookings.paymentStatus, totalMinor: bookings.totalMinor, confirmedAt: bookings.confirmedAt, createdAt: bookings.createdAt }).from(bookings).where(eq(bookings.eventId, event.id)),
    db.select({ id: bookingAttendees.id, bookingId: bookingAttendees.bookingId, name: bookingAttendees.name, seatId: bookingAttendees.seatId, ticketCategoryId: bookingAttendees.ticketCategoryId, priceMinor: bookingAttendees.priceMinor, priceBandName: bookingAttendees.priceBandName, checkedInAt: checkIns.checkedInAt }).from(bookingAttendees).innerJoin(bookings, eq(bookings.id, bookingAttendees.bookingId)).leftJoin(checkIns, and(eq(checkIns.bookingAttendeeId, bookingAttendees.id), isNull(checkIns.reversedAt))).where(eq(bookings.eventId, event.id)),
    db.select({ seatId: inventoryHolds.seatId, ticketCategoryId: inventoryHolds.ticketCategoryId, quantity: inventoryHolds.quantity }).from(inventoryHolds).where(and(eq(inventoryHolds.eventId, event.id), eq(inventoryHolds.status, "active"), gt(inventoryHolds.expiresAt, new Date()))),
  ]);
  return buildEventAnalytics({ ...event, seats: eventSeats, categories, bookings: eventBookings, attendees: attendees.map((attendee) => ({ ...attendee, checkedInAt: attendee.checkedInAt?.toISOString() ?? null })), holds });
}

export async function loadEventRevenue(eventIds: string[]) {
  if (!eventIds.length) return [];
  const db = getDatabase();
  const [sales, returned] = await Promise.all([
    db.select({ eventId: bookings.eventId, currency: paymentTransactions.currency, collectedMinor: sql<number>`coalesce(sum(${paymentTransactions.amountMinor}), 0)`.mapWith(Number) }).from(paymentTransactions).innerJoin(bookings, eq(bookings.id, paymentTransactions.bookingId)).where(and(inArray(bookings.eventId, eventIds), eq(paymentTransactions.status, "paid"), eq(paymentTransactions.type, "charge"))).groupBy(bookings.eventId, paymentTransactions.currency),
    db.select({ eventId: bookings.eventId, currency: bookings.currency, refundedMinor: sql<number>`coalesce(sum(${refunds.amountMinor}), 0)`.mapWith(Number) }).from(refunds).innerJoin(refundRequests, eq(refundRequests.id, refunds.refundRequestId)).innerJoin(bookings, eq(bookings.id, refundRequests.bookingId)).where(and(inArray(bookings.eventId, eventIds), eq(refunds.status, "processed"))).groupBy(bookings.eventId, bookings.currency),
  ]);
  const keys = new Set([...sales, ...returned].map((row) => `${row.eventId}:${row.currency}`));
  return [...keys].map((key) => {
    const [eventId, currency] = key.split(":");
    return { eventId, currency, collectedMinor: sales.find((row) => row.eventId === eventId && row.currency === currency)?.collectedMinor ?? 0, refundedMinor: returned.find((row) => row.eventId === eventId && row.currency === currency)?.refundedMinor ?? 0 };
  });
}
