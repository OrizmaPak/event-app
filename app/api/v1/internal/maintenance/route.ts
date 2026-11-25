import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { bookingAttendees, bookings, inventoryHolds, seats, ticketCategories } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function POST(request: Request) {
  const id = requestId(request);
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return fail("UNAUTHORIZED", "Unauthorized.", 401, null, id);
  const db = getDatabase();
  const result = await db.transaction(async (tx) => {
    const staleBookings = await tx.select().from(bookings).where(and(eq(bookings.status, "awaiting_payment"), lt(bookings.expiresAt, new Date()))).for("update");
    for (const booking of staleBookings) {
      const attendees = await tx.select().from(bookingAttendees).where(eq(bookingAttendees.bookingId, booking.id));
      const seatIds = attendees.flatMap((attendee) => attendee.seatId ? [attendee.seatId] : []);
      if (seatIds.length) await tx.update(seats).set({ status: "available" }).where(inArray(seats.id, seatIds));
      const categoryCounts = new Map<string, number>();
      for (const attendee of attendees) if (attendee.ticketCategoryId) categoryCounts.set(attendee.ticketCategoryId, (categoryCounts.get(attendee.ticketCategoryId) ?? 0) + 1);
      for (const [categoryId, count] of categoryCounts) await tx.update(ticketCategories).set({ quantitySold: sql`greatest(0, ${ticketCategories.quantitySold} - ${count})` }).where(eq(ticketCategories.id, categoryId));
      await tx.update(bookings).set({ status: "expired", paymentStatus: "expired", updatedAt: new Date() }).where(eq(bookings.id, booking.id));
    }
    const expiredHolds = await tx.update(inventoryHolds).set({ status: "expired" }).where(and(eq(inventoryHolds.status, "active"), lt(inventoryHolds.expiresAt, new Date()))).returning({ id: inventoryHolds.id });
    return { expiredBookings: staleBookings.length, expiredHolds: expiredHolds.length };
  }, { isolationLevel: "serializable" });
  return ok(result, 200, id);
}

export const GET = POST;
