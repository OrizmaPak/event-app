import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { events, layoutObjects, priceBands, seats } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

const seatingSchema = z.object({
  objects: z.array(z.object({ id: z.string().min(1).max(120), type: z.string().min(1).max(40), label: z.string().min(1).max(120), x: z.number().min(0).max(100), y: z.number().min(0).max(100), width: z.number().positive().max(100), height: z.number().positive().max(100), rotation: z.number().min(0).max(360), seatCount: z.number().int().min(0).max(200), priceBandId: z.string().optional() })).max(1_000),
  bands: z.array(z.object({ id: z.string().min(1).max(120), name: z.string().min(1).max(120), price: z.number().min(0).max(100_000_000), color: z.string().regex(/^#[0-9a-f]{6}$/i) })).min(1).max(100),
  seatEdits: z.record(z.string(), z.object({ priceBandId: z.string().optional(), status: z.enum(["available", "held", "booked", "reserved", "blocked", "unavailable"]).optional(), note: z.string().max(300).optional() })),
  canvas: z.object({ width: z.number().int().min(400).max(5_000), height: z.number().int().min(400).max(5_000) }),
});

function seatKey(objectId: string, index: number) { return `${objectId}-seat-${String(index + 1).padStart(2, "0")}`; }

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const id = requestId(request);
  const principal = await requirePermission("seating.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to manage seating.", 403, null, id);
  const { slug } = await context.params;
  if (principal.eventScope !== "all" && principal.eventScope !== slug) return fail("FORBIDDEN", "This event is outside your assigned scope.", 403, null, id);
  const parsed = seatingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "The seating plan is invalid.", 400, null, id);

  const db = getDatabase();
  const [event] = await db.select({ id: events.id, admissionMode: events.admissionMode }).from(events).where(and(eq(events.organizerId, principal.organizerId), eq(events.slug, slug))).limit(1);
  if (!event || event.admissionMode !== "selectable") return fail("EVENT_NOT_FOUND", "A guest-selectable seating event was not found.", 404, null, id);

  try {
    await db.transaction(async (tx) => {
      const [existingBands, existingObjects, existingSeats] = await Promise.all([
        tx.select().from(priceBands).where(eq(priceBands.eventId, event.id)),
        tx.select().from(layoutObjects).where(eq(layoutObjects.eventId, event.id)),
        tx.select().from(seats).where(eq(seats.eventId, event.id)),
      ]);
      const bandIds = new Set(existingBands.map((band) => band.id));
      const savedBandIds = new Map<string, string>();
      for (const band of parsed.data.bands) {
        if (bandIds.has(band.id)) {
          await tx.update(priceBands).set({ name: band.name, priceMinor: Math.round(band.price * 100), color: band.color }).where(eq(priceBands.id, band.id));
          savedBandIds.set(band.id, band.id);
        } else {
          const [saved] = await tx.insert(priceBands).values({ eventId: event.id, name: band.name, priceMinor: Math.round(band.price * 100), color: band.color }).returning({ id: priceBands.id });
          savedBandIds.set(band.id, saved.id);
        }
      }

      const objectByClientId = new Map(existingObjects.map((object) => [String(object.presentation.clientId ?? object.id), object]));
      const seatsByStableKey = new Map(existingSeats.map((seat) => [seat.stableKey, seat]));
      const keptObjectIds = new Set<string>();

      for (const [sortOrder, object] of parsed.data.objects.entries()) {
        const priceBandId = object.priceBandId ? savedBandIds.get(object.priceBandId) : undefined;
        const presentation = { clientId: object.id, x: object.x, y: object.y, width: object.width, height: object.height, rotation: object.rotation, seatCount: object.seatCount, priceBandId, canvas: parsed.data.canvas };
        const existing = objectByClientId.get(object.id);
        const savedObject = existing
          ? (await tx.update(layoutObjects).set({ type: object.type, label: object.label, presentation, sortOrder }).where(eq(layoutObjects.id, existing.id)).returning())[0]
          : (await tx.insert(layoutObjects).values({ eventId: event.id, type: object.type, label: object.label, presentation, sortOrder }).returning())[0];
        keptObjectIds.add(savedObject.id);

        for (let index = 0; index < object.seatCount; index += 1) {
          const stableKey = seatKey(object.id, index);
          const draftEdit = parsed.data.seatEdits[`${object.id}:${index}`];
          const previous = seatsByStableKey.get(stableKey);
          const status = draftEdit?.status ?? "available";
          const nextBandId = savedBandIds.get(draftEdit?.priceBandId ?? object.priceBandId ?? "") ?? null;
          const values = { layoutObjectId: savedObject.id, label: `${object.label} · Seat ${String(index + 1).padStart(2, "0")}`, shortLabel: String(index + 1).padStart(2, "0"), priceBandId: nextBandId, status, reservedFor: status === "reserved" ? draftEdit?.note ?? null : null, blockedReason: status === "blocked" || status === "unavailable" ? draftEdit?.note ?? null : null };
          if (previous) {
            if (previous.status === "booked" || previous.status === "held") {
              if ((draftEdit?.priceBandId && previous.priceBandId !== nextBandId) || (draftEdit?.status && draftEdit.status !== previous.status)) throw new Error("LIVE_SEAT_PROTECTED");
              await tx.update(seats).set({ layoutObjectId: savedObject.id, label: values.label, shortLabel: values.shortLabel }).where(eq(seats.id, previous.id));
            } else {
              await tx.update(seats).set(values).where(eq(seats.id, previous.id));
            }
          } else {
            await tx.insert(seats).values({ eventId: event.id, stableKey, ...values });
          }
        }
      }

      const desiredStableKeys = new Set(parsed.data.objects.flatMap((object) => Array.from({ length: object.seatCount }, (_, index) => seatKey(object.id, index))));
      for (const seat of existingSeats) {
        if (desiredStableKeys.has(seat.stableKey)) continue;
        if (seat.status === "booked" || seat.status === "held") throw new Error("LIVE_SEAT_PROTECTED");
        await tx.delete(seats).where(eq(seats.id, seat.id));
      }
      for (const object of existingObjects) {
        if (!keptObjectIds.has(object.id)) await tx.delete(layoutObjects).where(eq(layoutObjects.id, object.id));
      }
      await tx.update(events).set({ capacity: parsed.data.objects.reduce((total, object) => total + object.seatCount, 0), updatedAt: new Date() }).where(eq(events.id, event.id));
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "LIVE_SEAT_PROTECTED"
      ? "Booked or actively held seats cannot be removed, repriced, or made unavailable. Keep those seats in the plan or release their hold first."
      : "The seating plan could not be saved.";
    return fail("SEATING_SAVE_FAILED", message, 409, null, id);
  }

  await writeAudit({ organizerId: principal.organizerId, eventId: event.id, actorUserId: principal.userId, action: "event_seating.updated", targetType: "event", targetId: event.id, requestId: id, metadata: { objects: parsed.data.objects.length } });
  return ok({ saved: true }, 200, id);
}
