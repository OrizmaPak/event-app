import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { bookings, events, paymentTransactions, refundRequests } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

const schema = z.object({ bookingId: z.string().uuid(), amountMinor: z.number().int().positive(), reason: z.string().trim().min(10).max(500) });

export async function POST(request: Request) {
  const id = requestId(request);
  const principal = await requirePermission("refunds.request");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to request refunds.", 403, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Enter a valid booking, amount and reason.", 400, null, id);
  const db = getDatabase();
  const [record] = await db.select({ booking: bookings, event: events, payment: paymentTransactions }).from(bookings).innerJoin(events, eq(events.id, bookings.eventId)).innerJoin(paymentTransactions, and(eq(paymentTransactions.bookingId, bookings.id), eq(paymentTransactions.status, "paid"))).where(and(eq(bookings.id, parsed.data.bookingId), eq(events.organizerId, principal.organizerId))).limit(1);
  if (!record) return fail("BOOKING_NOT_REFUNDABLE", "A paid booking could not be found.", 404, null, id);
  const prior = await db.select({ amountMinor: refundRequests.amountMinor }).from(refundRequests).where(and(eq(refundRequests.bookingId, record.booking.id), ne(refundRequests.status, "rejected")));
  const remaining = record.payment.amountMinor - prior.reduce((sum, item) => sum + item.amountMinor, 0);
  if (parsed.data.amountMinor > remaining) return fail("REFUND_AMOUNT_EXCEEDED", "The refund exceeds the remaining paid amount.", 409, null, id);
  const [created] = await db.insert(refundRequests).values({ organizerId: principal.organizerId, bookingId: record.booking.id, requestedBy: principal.userId, amountMinor: parsed.data.amountMinor, reason: parsed.data.reason }).returning();
  await writeAudit({ organizerId: principal.organizerId, actorUserId: principal.userId, action: "refund.requested", targetType: "refund_request", targetId: created.id, requestId: id, metadata: { amountMinor: created.amountMinor, bookingId: created.bookingId } });
  return ok(created, 201, id);
}
