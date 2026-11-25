import { and, asc, eq, gt, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { events, inventoryHolds, layoutObjects, priceBands, seats, ticketCategories } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { getPublicEventInvitation } from "@/lib/server/public-event-access";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const id = requestId(request);
  const db = getDatabase();
  const [event] = await db.select().from(events).where(and(eq(events.slug, (await params).slug), eq(events.status, "published"))).limit(1);
  if (!event) return fail("EVENT_NOT_FOUND", "Event not found.", 404, null, id);
  const access = await getPublicEventInvitation(request, event);
  if (!access.allowed) return fail("INVITATION_REQUIRED", "Verify your invitation to view ticket availability.", 401, null, id);

  await db.update(inventoryHolds).set({ status: "expired" }).where(and(eq(inventoryHolds.eventId, event.id), eq(inventoryHolds.status, "active"), sql`${inventoryHolds.expiresAt} <= now()`));
  const [bands, eventSeats, categories, activeHolds, objects] = await Promise.all([
    db.select().from(priceBands).where(eq(priceBands.eventId, event.id)).orderBy(priceBands.name),
    event.admissionMode === "selectable" ? db.select().from(seats).where(eq(seats.eventId, event.id)).orderBy(seats.label) : Promise.resolve([]),
    db.select().from(ticketCategories).where(eq(ticketCategories.eventId, event.id)).orderBy(ticketCategories.sortOrder, ticketCategories.name),
    db.select({ seatId: inventoryHolds.seatId, ticketCategoryId: inventoryHolds.ticketCategoryId, quantity: inventoryHolds.quantity }).from(inventoryHolds).where(and(eq(inventoryHolds.eventId, event.id), eq(inventoryHolds.status, "active"), gt(inventoryHolds.expiresAt, new Date()))),
    event.admissionMode === "selectable" ? db.select().from(layoutObjects).where(eq(layoutObjects.eventId, event.id)).orderBy(asc(layoutObjects.sortOrder)) : Promise.resolve([]),
  ]);
  const heldSeatIds = new Set(activeHolds.flatMap((hold) => hold.seatId ? [hold.seatId] : []));
  const heldByCategory = new Map<string, number>();
  for (const hold of activeHolds) if (hold.ticketCategoryId) heldByCategory.set(hold.ticketCategoryId, (heldByCategory.get(hold.ticketCategoryId) ?? 0) + hold.quantity);
  const bandById = new Map(bands.map((band) => [band.id, band]));

  return ok({
    event: { id: event.id, slug: event.slug, pricingMode: event.pricingMode, admissionMode: event.admissionMode, currency: event.currency, bookingLimit: event.bookingLimit },
    priceBands: bands.map((band) => ({ id: band.id, name: band.name, color: band.color, priceMinor: band.priceMinor })),
    layout: {
      objects: objects.map((object) => {
        const presentation = object.presentation;
        return {
          id: object.id,
          type: object.type,
          label: object.label,
          x: Number(presentation.x ?? 0),
          y: Number(presentation.y ?? 0),
          width: Number(presentation.width ?? 20),
          height: Number(presentation.height ?? 20),
          rotation: Number(presentation.rotation ?? 0),
          seatCount: Number(presentation.seatCount ?? 0),
          canvas: presentation.canvas,
        };
      }),
    },
    seats: eventSeats.map((seat) => ({ id: seat.id, layoutObjectId: seat.layoutObjectId, stableKey: seat.stableKey, label: seat.label, shortLabel: seat.shortLabel, priceBandId: seat.priceBandId, priceMinor: seat.priceOverrideMinor ?? (seat.priceBandId ? bandById.get(seat.priceBandId)?.priceMinor : 0) ?? 0, status: heldSeatIds.has(seat.id) && seat.status === "available" ? "held" : seat.status })),
    ticketCategories: categories.map((category) => ({ id: category.id, name: category.name, description: category.description, color: category.color, priceMinor: category.priceMinor, quantityAvailable: Math.max(0, category.quantityAvailable - category.quantitySold - (heldByCategory.get(category.id) ?? 0)) })),
  }, 200, id);
}
