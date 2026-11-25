import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { events, inventoryHolds, priceBands, seats, ticketCategories } from "@/db/schema";
import { createOpaqueToken, hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { getPublicEventInvitation } from "@/lib/server/public-event-access";

const inputSchema = z.object({ seatIds: z.array(z.string().uuid()).max(100).default([]), tickets: z.array(z.object({ ticketCategoryId: z.string().uuid(), quantity: z.number().int().min(1).max(100) })).max(20).default([]) }).refine((value) => value.seatIds.length > 0 || value.tickets.length > 0, "Select at least one ticket or seat");

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const id = requestId(request);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Select valid tickets or seats.", 400, null, id);
  if (new Set(parsed.data.seatIds).size !== parsed.data.seatIds.length || new Set(parsed.data.tickets.map((ticket) => ticket.ticketCategoryId)).size !== parsed.data.tickets.length) return fail("VALIDATION_ERROR", "Select each seat or ticket category only once.", 400, null, id);
  const db = getDatabase();
  const [event] = await db.select().from(events).where(and(eq(events.slug, (await params).slug), eq(events.status, "published"))).limit(1);
  if (!event) return fail("EVENT_NOT_FOUND", "Event not found.", 404, null, id);
  const access = await getPublicEventInvitation(request, event);
  if (!access.allowed) return fail("INVITATION_REQUIRED", "Verify your invitation before selecting tickets.", 401, null, id);
  if (event.admissionMode !== "selectable" && parsed.data.seatIds.length) return fail("SEATING_DISABLED", "This event does not use guest seat selection.", 400, null, id);
  if (event.admissionMode === "selectable" && parsed.data.tickets.length) return fail("SEAT_REQUIRED", "Choose seats for this event.", 400, null, id);
  const holdToken = createOpaqueToken();
  const holdHash = hashToken(holdToken);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  let result: Array<{ type: "seat" | "ticket"; id: string; label: string; priceMinor: number; quantity: number }>;
  try { result = await db.transaction(async (tx) => {
    await tx.update(inventoryHolds).set({ status: "expired" }).where(and(eq(inventoryHolds.status, "active"), sql`${inventoryHolds.expiresAt} <= now()`));
    const heldItems: Array<{ type: "seat" | "ticket"; id: string; label: string; priceMinor: number; quantity: number }> = [];
    if (parsed.data.seatIds.length) {
      const selectedSeats = await tx.select().from(seats).where(and(eq(seats.eventId, event.id), inArray(seats.id, parsed.data.seatIds))).for("update");
      if (selectedSeats.length !== parsed.data.seatIds.length || selectedSeats.some((seat) => seat.status !== "available")) throw new Error("SEAT_UNAVAILABLE");
      const active = await tx.select({ seatId: inventoryHolds.seatId }).from(inventoryHolds).where(and(eq(inventoryHolds.eventId, event.id), eq(inventoryHolds.status, "active"), gt(inventoryHolds.expiresAt, new Date()), inArray(inventoryHolds.seatId, parsed.data.seatIds)));
      if (active.length) throw new Error("SEAT_UNAVAILABLE");
      const bandIds = selectedSeats.flatMap((seat) => seat.priceBandId ? [seat.priceBandId] : []);
      const selectedBands = bandIds.length ? await tx.select().from(priceBands).where(inArray(priceBands.id, bandIds)) : [];
      const bandById = new Map(selectedBands.map((band) => [band.id, band]));
      await tx.insert(inventoryHolds).values(selectedSeats.map((seat) => ({ eventId: event.id, seatId: seat.id, holdTokenHash: holdHash, expiresAt })));
      heldItems.push(...selectedSeats.map((seat) => ({ type: "seat" as const, id: seat.id, label: seat.label, priceMinor: seat.priceOverrideMinor ?? (seat.priceBandId ? bandById.get(seat.priceBandId)?.priceMinor : 0) ?? 0, quantity: 1 })));
    }
    for (const selection of parsed.data.tickets) {
      const [category] = await tx.select().from(ticketCategories).where(and(eq(ticketCategories.id, selection.ticketCategoryId), eq(ticketCategories.eventId, event.id))).for("update").limit(1);
      if (!category) throw new Error("TICKET_UNAVAILABLE");
      const active = await tx.select({ quantity: inventoryHolds.quantity }).from(inventoryHolds).where(and(eq(inventoryHolds.ticketCategoryId, category.id), eq(inventoryHolds.status, "active"), gt(inventoryHolds.expiresAt, new Date())));
      const held = active.reduce((total, row) => total + row.quantity, 0);
      if (category.quantitySold + held + selection.quantity > category.quantityAvailable) throw new Error("TICKET_UNAVAILABLE");
      await tx.insert(inventoryHolds).values({ eventId: event.id, ticketCategoryId: category.id, holdTokenHash: holdHash, quantity: selection.quantity, expiresAt });
      heldItems.push({ type: "ticket", id: category.id, label: category.name, priceMinor: category.priceMinor, quantity: selection.quantity });
    }
    return heldItems;
  }, { isolationLevel: "serializable" }); } catch (error) {
    const code = error instanceof Error ? error.message : "INVENTORY_CONFLICT";
    if (code === "SEAT_UNAVAILABLE" || code === "TICKET_UNAVAILABLE") return fail(code, "One or more selections are no longer available. Refresh and choose again.", 409, null, id);
    throw error;
  }
  return ok({ holdToken, expiresAt, currency: event.currency, items: result, subtotalMinor: result.reduce((total, item) => total + item.priceMinor * item.quantity, 0) }, 201, id);
}
