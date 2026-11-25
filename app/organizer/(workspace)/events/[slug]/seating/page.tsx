import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { bookingAttendees, bookings, checkIns, events, layoutObjects, priceBands, seats } from "@/db/schema";
import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { PublishedSeatingManager } from "@/components/dashboard/PublishedSeatingManager";
import { getDatabase } from "@/lib/db/client";
import { nasaClient } from "@/lib/services/nasa-client";
import type { LayoutObject } from "@/lib/data/types";

export default async function EventSeatingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event || event.admissionMode === "general") notFound();
  const db = getDatabase();
  const [rows, bands, eventSeats, attendeeRows] = await Promise.all([
    db.select({ object: layoutObjects }).from(layoutObjects).innerJoin(events, eq(events.id, layoutObjects.eventId)).where(and(eq(events.slug, slug), eq(events.organizerId, event.organizerId))).orderBy(asc(layoutObjects.sortOrder)),
    db.select().from(priceBands).where(eq(priceBands.eventId, event.id)),
    db.select().from(seats).where(eq(seats.eventId, event.id)),
    db.select({ booking: bookings, attendee: bookingAttendees, checkIn: checkIns }).from(bookingAttendees).innerJoin(bookings, eq(bookings.id, bookingAttendees.bookingId)).leftJoin(checkIns, and(eq(checkIns.bookingAttendeeId, bookingAttendees.id), isNull(checkIns.reversedAt))).where(eq(bookings.eventId, event.id)),
  ]);
  const objectClientIds = new Map(rows.map(({ object }) => [object.id, String(object.presentation.clientId ?? object.id)]));
  const objects = rows.map(({ object }) => {
    const clientId = String(object.presentation.clientId ?? object.id);
    const firstSeat = eventSeats.find((seat) => seat.layoutObjectId === object.id);
    return { id: clientId, type: object.type, label: object.label, x: Number(object.presentation.x ?? 0), y: Number(object.presentation.y ?? 0), width: Number(object.presentation.width ?? 20), height: Number(object.presentation.height ?? 20), rotation: Number(object.presentation.rotation ?? 0), seatCount: Number(object.presentation.seatCount ?? 0), priceBandId: typeof object.presentation.priceBandId === "string" ? object.presentation.priceBandId : firstSeat?.priceBandId ?? undefined } as LayoutObject;
  });
  const seatEdits = Object.fromEntries(eventSeats.flatMap((seat) => {
    const clientId = objectClientIds.get(seat.layoutObjectId);
    const match = seat.stableKey.match(/-seat-(\d+)$/);
    if (!clientId || !match) return [];
    const object = objects.find((item) => item.id === clientId);
    const index = Number(match[1]) - 1;
    const baseBandId = object?.priceBandId;
    if (seat.status === "available" && seat.priceBandId === baseBandId) return [];
    return [[`${clientId}:${index}`, { priceBandId: seat.priceBandId ?? undefined, status: seat.status as "available" | "held" | "booked" | "reserved" | "blocked" | "unavailable", note: seat.reservedFor ?? seat.blockedReason ?? undefined }]];
  }));
  const canvas = rows[0]?.object.presentation.canvas;
  const initialCanvas = typeof canvas === "object" && canvas !== null && "width" in canvas && "height" in canvas ? { width: Number(canvas.width), height: Number(canvas.height) } : undefined;
  const bookingGroups = new Map<string, { code: string; buyerName: string; buyerEmail: string; buyerPhone: string | null; paymentStatus: string; status: string; attendees: { id: string; name: string; email: string | null; phone: string | null; seatLabel: string | null; priceBandName: string; priceMinor: number; checkedIn: boolean }[] }>();
  attendeeRows.forEach(({ booking, attendee, checkIn }) => {
    const group = bookingGroups.get(booking.id) ?? { code: booking.code, buyerName: booking.buyerName, buyerEmail: booking.buyerEmail, buyerPhone: booking.buyerPhone, paymentStatus: booking.paymentStatus, status: booking.status, attendees: [] };
    group.attendees.push({ id: attendee.id, name: attendee.name, email: attendee.email, phone: attendee.phone, seatLabel: eventSeats.find((seat) => seat.id === attendee.seatId)?.label ?? null, priceBandName: attendee.priceBandName, priceMinor: attendee.priceMinor, checkedIn: Boolean(checkIn) });
    bookingGroups.set(booking.id, group);
  });
  const seatView = eventSeats.flatMap((seat) => {
    const clientId = objectClientIds.get(seat.layoutObjectId);
    const match = seat.stableKey.match(/-seat-(\d+)$/);
    if (!clientId || !match) return [];
    const bookingRow = attendeeRows.find(({ attendee }) => attendee.seatId === seat.id);
    return [{ key: `${clientId}:${Number(match[1]) - 1}`, label: seat.label, shortLabel: seat.shortLabel, status: seat.status as "available" | "held" | "booked" | "reserved" | "blocked" | "unavailable", priceBandId: seat.priceBandId ?? undefined, note: seat.reservedFor ?? seat.blockedReason ?? undefined, booking: bookingRow ? bookingGroups.get(bookingRow.booking.id) : undefined }];
  });
  return <><EventManagementHeader event={event} /><PublishedSeatingManager initialObjects={objects} initialBands={bands.map((band) => ({ id: band.id, name: band.name, price: band.priceMinor / 100, color: band.color }))} initialSeatEdits={seatEdits} initialCanvas={initialCanvas} seats={seatView} saveUrl={`/api/v1/workspaces/current/events/${slug}/seating`} heading={event.shortTitle} /></>;
}
