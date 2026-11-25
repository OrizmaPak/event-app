import { and, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BookingManager, type OrganizerBooking } from "@/components/dashboard/BookingManager";
import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { fallbackBooking } from "@/lib/data/seating-data";
import { bookingAttendees, bookings, checkIns, events, priceBands, seats, ticketCategories } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { nasaClient } from "@/lib/services/nasa-client";
import { demoPriceBands, demoSeats } from "@/lib/data/seating-data";

export default async function EventBookingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await nasaClient.getEvent(slug);
  if (!event) notFound();
  let bookingRows: OrganizerBooking[] = [];
  let expectedRevenueMinor = 0;
  let totalPlaces = 0;
  if (process.env.DATABASE_URL) {
    const db = getDatabase();
    const [rows, eventSeats, bands, categories] = await Promise.all([
      db.select({ booking: bookings, attendee: bookingAttendees, seatLabel: seats.label, checkInId: checkIns.id }).from(bookingAttendees).innerJoin(bookings, eq(bookings.id, bookingAttendees.bookingId)).innerJoin(events, and(eq(events.id, bookings.eventId), eq(events.id, event.id), eq(events.organizerId, event.organizerId))).leftJoin(seats, eq(seats.id, bookingAttendees.seatId)).leftJoin(checkIns, and(eq(checkIns.bookingAttendeeId, bookingAttendees.id), isNull(checkIns.reversedAt))).orderBy(desc(bookings.createdAt)),
      db.select().from(seats).where(eq(seats.eventId, event.id)),
      db.select().from(priceBands).where(eq(priceBands.eventId, event.id)),
      db.select().from(ticketCategories).where(eq(ticketCategories.eventId, event.id)),
    ]);
    if (event.admissionMode === "selectable") {
      const bandPrices = new Map(bands.map((band) => [band.id, band.priceMinor]));
      totalPlaces = eventSeats.length;
      expectedRevenueMinor = eventSeats.reduce((sum, seat) => sum + (seat.priceOverrideMinor ?? bandPrices.get(seat.priceBandId ?? "") ?? 0), 0);
    } else {
      totalPlaces = categories.reduce((sum, category) => sum + category.quantityAvailable, 0);
      expectedRevenueMinor = categories.reduce((sum, category) => sum + category.quantityAvailable * category.priceMinor, 0);
    }
    const groups = new Map<string, OrganizerBooking>();
    rows.forEach(({ booking, attendee, seatLabel, checkInId }) => {
      const group = groups.get(booking.id) ?? { id: booking.id, code: booking.code, buyerName: booking.buyerName, buyerEmail: booking.buyerEmail, buyerPhone: booking.buyerPhone, status: booking.status, paymentStatus: booking.paymentStatus, totalMinor: booking.totalMinor, currency: booking.currency, createdAt: booking.createdAt.toISOString(), attendees: [] };
      group.attendees.push({ id: attendee.id, name: attendee.name, email: attendee.email, seatLabel: seatLabel ?? null, priceBandName: attendee.priceBandName, priceMinor: attendee.priceMinor, checkedIn: Boolean(checkInId) });
      groups.set(booking.id, group);
    });
    bookingRows = [...groups.values()];
  } else {
    totalPlaces = demoSeats.length;
    const bandPrices = new Map(demoPriceBands.map((band) => [band.id, band.price * 100]));
    expectedRevenueMinor = demoSeats.reduce((sum, seat) => sum + (bandPrices.get(seat.priceBandId ?? "") ?? 0), 0);
    bookingRows = [{ id: fallbackBooking.id, code: fallbackBooking.code, buyerName: fallbackBooking.buyerName, buyerEmail: fallbackBooking.buyerEmail, buyerPhone: fallbackBooking.buyerPhone, status: "confirmed", paymentStatus: fallbackBooking.paymentStatus, totalMinor: fallbackBooking.total, currency: fallbackBooking.currency, createdAt: fallbackBooking.createdAt, attendees: fallbackBooking.attendees.map((attendee, index) => ({ id: attendee.id, name: attendee.name, email: null, seatLabel: attendee.seatLabel ?? null, priceBandName: attendee.priceBandName, priceMinor: attendee.price * 100, checkedIn: index === 1 })) }];
  }
  return <><EventManagementHeader event={event} /><BookingManager eventTitle={event.title} bookings={bookingRows} expectedRevenueMinor={expectedRevenueMinor} totalPlaces={totalPlaces} /></>;
}
