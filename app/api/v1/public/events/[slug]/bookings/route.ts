import { and, eq, gt, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { bookingAttendees, bookings, events, inventoryHolds, invitations, notificationDeliveries, notifications, priceBands, seats, ticketCategories } from "@/db/schema";
import { createOpaqueToken, hashToken, normalizeEmail } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { getPublicEventInvitation } from "@/lib/server/public-event-access";
import { encryptSecret } from "@/lib/security/encryption";

const attendeeSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email(), phone: z.string().trim().max(30).optional(), seatId: z.string().uuid().optional(), ticketCategoryId: z.string().uuid().optional(), answers: z.record(z.string(), z.unknown()).default({}) });
const inputSchema = z.object({ holdToken: z.string().min(20), buyerName: z.string().trim().min(2).max(120), buyerEmail: z.string().trim().email(), buyerPhone: z.string().trim().max(30).optional(), attendees: z.array(attendeeSchema).min(1).max(100), answers: z.record(z.string(), z.unknown()).default({}) });

function bookingCode(shortTitle: string) { return `${shortTitle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "EVNT"}-${createOpaqueToken(6).toUpperCase()}`; }

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const id = requestId(request);
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 12) return fail("IDEMPOTENCY_KEY_REQUIRED", "A valid idempotency key is required.", 400, null, id);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Complete the buyer and attendee details.", 400, Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])), id);
  const attendeeSeatIds = parsed.data.attendees.flatMap((attendee) => attendee.seatId ? [attendee.seatId] : []);
  if (new Set(attendeeSeatIds).size !== attendeeSeatIds.length) return fail("HOLD_MISMATCH", "Each attendee must have a different seat.", 400, null, id);
  const db = getDatabase();
  const [existing] = await db.select().from(bookings).where(eq(bookings.idempotencyKey, idempotencyKey)).limit(1);
  const [event] = await db.select().from(events).where(and(eq(events.slug, (await params).slug), eq(events.status, "published"))).limit(1);
  if (!event) return fail("EVENT_NOT_FOUND", "Event not found.", 404, null, id);
  const access = await getPublicEventInvitation(request, event);
  if (!access.allowed) return fail("INVITATION_REQUIRED", "Verify your invitation before booking.", 401, null, id);
  if (existing) {
    if (existing.eventId !== event.id || existing.buyerEmail !== normalizeEmail(parsed.data.buyerEmail)) return fail("IDEMPOTENCY_CONFLICT", "This booking request has already been used.", 409, null, id);
    return ok({ bookingId: existing.id, code: existing.code, status: existing.status, paymentRequired: existing.paymentStatus === "pending" }, 200, id);
  }
  if (event.bookingLimit && parsed.data.attendees.length > event.bookingLimit) return fail("BOOKING_LIMIT", `This event allows up to ${event.bookingLimit} attendees per booking.`, 400, null, id);
  if (access.invitationId) {
    const [invitation] = await db.select({ partyAllowance: invitations.partyAllowance }).from(invitations).where(eq(invitations.id, access.invitationId)).limit(1);
    if (!invitation || parsed.data.attendees.length > invitation.partyAllowance) return fail("PARTY_LIMIT", "This invitation does not allow that many attendees.", 400, null, id);
  }
  const qrToken = createOpaqueToken(36);
  const managementToken = createOpaqueToken(36);
  try {
    const created = await db.transaction(async (tx) => {
      const lockedHolds = await tx.select().from(inventoryHolds).where(and(eq(inventoryHolds.eventId, event.id), eq(inventoryHolds.holdTokenHash, hashToken(parsed.data.holdToken)), eq(inventoryHolds.status, "active"), gt(inventoryHolds.expiresAt, new Date()))).for("update");
      const seatIds = lockedHolds.flatMap((hold) => hold.seatId ? [hold.seatId] : []);
      const categoryIds = lockedHolds.flatMap((hold) => hold.ticketCategoryId ? [hold.ticketCategoryId] : []);
      const selectedSeats = seatIds.length ? await tx.select().from(seats).where(inArray(seats.id, seatIds)) : [];
      const selectedCategories = categoryIds.length ? await tx.select().from(ticketCategories).where(inArray(ticketCategories.id, categoryIds)) : [];
      const bandIds = selectedSeats.flatMap((seat) => seat.priceBandId ? [seat.priceBandId] : []);
      const selectedBands = bandIds.length ? await tx.select().from(priceBands).where(inArray(priceBands.id, bandIds)) : [];
      const holds = lockedHolds.map((hold) => {
        const seat = selectedSeats.find((item) => item.id === hold.seatId) ?? null;
        return { hold, seat, band: selectedBands.find((item) => item.id === seat?.priceBandId) ?? null, category: selectedCategories.find((item) => item.id === hold.ticketCategoryId) ?? null };
      });
      const expectedCount = holds.reduce((total, row) => total + row.hold.quantity, 0);
      if (!holds.length || expectedCount !== parsed.data.attendees.length) throw new Error("HOLD_INVALID");
      const pricedAttendees = parsed.data.attendees.map((attendee) => {
        const row = attendee.seatId ? holds.find((item) => item.seat?.id === attendee.seatId) : holds.find((item) => item.category?.id === attendee.ticketCategoryId);
        if (!row) throw new Error("HOLD_MISMATCH");
        return { ...attendee, seatId: row.seat?.id, ticketCategoryId: row.category?.id, priceMinor: row.seat ? row.seat.priceOverrideMinor ?? row.band?.priceMinor ?? 0 : row.category?.priceMinor ?? 0, priceBandName: row.band?.name ?? row.category?.name ?? "Admission" };
      });
      for (const row of holds.filter((item) => item.category)) {
        const count = pricedAttendees.filter((attendee) => attendee.ticketCategoryId === row.category!.id).length;
        if (count !== row.hold.quantity) throw new Error("HOLD_MISMATCH");
      }
      const subtotalMinor = pricedAttendees.reduce((total, attendee) => total + attendee.priceMinor, 0);
      const platformFeeMinor = Math.round(subtotalMinor * event.platformFeeBps / 10_000);
      const paymentRequired = event.pricingMode === "paid" && subtotalMinor > 0;
      const [booking] = await tx.insert(bookings).values({ eventId: event.id, invitationId: access.invitationId, code: bookingCode(event.shortTitle), qrTokenHash: hashToken(qrToken), qrTokenEncrypted: encryptSecret(qrToken), managementTokenHash: hashToken(managementToken), idempotencyKey, status: paymentRequired ? "awaiting_payment" : "confirmed", buyerName: parsed.data.buyerName, buyerEmail: normalizeEmail(parsed.data.buyerEmail), buyerPhone: parsed.data.buyerPhone || null, currency: event.currency, subtotalMinor, feesMinor: 0, platformFeeMinor, totalMinor: subtotalMinor, paymentStatus: paymentRequired ? "pending" : "not_required", answers: parsed.data.answers, expiresAt: paymentRequired ? new Date(Date.now() + 30 * 60 * 1000) : null, confirmedAt: paymentRequired ? null : new Date() }).returning();
      await tx.insert(bookingAttendees).values(pricedAttendees.map((attendee) => ({ bookingId: booking.id, ticketCategoryId: attendee.ticketCategoryId, seatId: attendee.seatId, name: attendee.name, email: normalizeEmail(attendee.email), phone: attendee.phone || null, priceMinor: attendee.priceMinor, priceBandName: attendee.priceBandName, answers: attendee.answers })));
      await tx.update(inventoryHolds).set({ status: "converted", convertedAt: new Date() }).where(eq(inventoryHolds.holdTokenHash, hashToken(parsed.data.holdToken)));
      for (const row of holds) {
        if (row.seat) await tx.update(seats).set({ status: paymentRequired ? "held" : "booked" }).where(eq(seats.id, row.seat.id));
        if (row.category) await tx.update(ticketCategories).set({ quantitySold: row.category.quantitySold + row.hold.quantity }).where(eq(ticketCategories.id, row.category.id));
      }
      if (!paymentRequired) {
        const [notification] = await tx.insert(notifications).values({ organizerId: event.organizerId, eventId: event.id, type: "booking.confirmed", title: `Booking ${booking.code} confirmed`, body: `${booking.buyerName} confirmed ${pricedAttendees.length} attendee${pricedAttendees.length === 1 ? "" : "s"}.`, data: { bookingId: booking.id } }).returning({ id: notifications.id });
        const passUrl = `${request.nextUrl.origin}/guest-pass/${encodeURIComponent(booking.code)}`;
        await tx.insert(notificationDeliveries).values({ notificationId: notification.id, channel: "email", recipient: booking.buyerEmail, subject: `Your pass for ${event.title}`, content: `Hello ${booking.buyerName}, your booking ${booking.code} is confirmed for ${pricedAttendees.length} attendee${pricedAttendees.length === 1 ? "" : "s"}. Open your reusable group pass: ${passUrl}`, status: "queued" });
      }
      return { booking, paymentRequired };
    }, { isolationLevel: "serializable" });
    return ok({ bookingId: created.booking.id, code: created.booking.code, status: created.booking.status, paymentRequired: created.paymentRequired, managementToken, qrToken: created.paymentRequired ? undefined : qrToken }, 201, id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BOOKING_CONFLICT";
    if (["HOLD_INVALID", "HOLD_MISMATCH"].includes(code)) return fail(code, "Your selection expired or changed. Choose tickets again.", 409, null, id);
    throw error;
  }
}
