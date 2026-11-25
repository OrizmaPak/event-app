import type { bookingAttendees, bookings, seats, ticketCategories } from "@/db/schema";

type Booking = Pick<typeof bookings.$inferSelect, "id" | "code" | "status" | "paymentStatus" | "totalMinor" | "confirmedAt" | "createdAt">;
type Attendee = Pick<typeof bookingAttendees.$inferSelect, "id" | "bookingId" | "name" | "seatId" | "ticketCategoryId" | "priceMinor" | "priceBandName"> & { checkedInAt: string | null };
type Seat = Pick<typeof seats.$inferSelect, "id" | "label" | "status" | "reservedFor" | "blockedReason"> & { table: string; band: string; priceMinor: number };
type Category = Pick<typeof ticketCategories.$inferSelect, "id" | "name" | "priceMinor" | "quantityAvailable" | "quantitySold">;

export type AnalyticsInput = {
  admissionMode: string;
  timezone: string;
  seats: Seat[];
  categories: Category[];
  bookings: Booking[];
  attendees: Attendee[];
  holds: Array<{ seatId: string | null; ticketCategoryId: string | null; quantity: number }>;
};

export type AnalyticsRow = {
  id: string; name: string; table: string; seat: string; band: string; priceMinor: number;
  status: string; confirmed: boolean; checkedInAt: string | null; bookingCode: string | null;
  attendeeId: string | null; quantity: number; available: number; confirmedCount: number; note: string;
};

export function buildEventAnalytics(input: AnalyticsInput) {
  const bookingById = new Map(input.bookings.map((booking) => [booking.id, booking]));
  const seatById = new Map(input.seats.map((seat) => [seat.id, seat]));
  const confirmedAttendees = input.attendees.filter((attendee) => bookingById.get(attendee.bookingId)?.status === "confirmed");
  const attendeeRows: AnalyticsRow[] = confirmedAttendees.map((attendee) => {
    const seat = seatById.get(attendee.seatId ?? "");
    return { id: attendee.id, name: attendee.name, table: seat?.table ?? "", seat: seat?.label ?? "", band: attendee.priceBandName, priceMinor: attendee.priceMinor, status: "booked", confirmed: true, checkedInAt: attendee.checkedInAt, bookingCode: bookingById.get(attendee.bookingId)!.code, attendeeId: attendee.id, quantity: 1, available: 0, confirmedCount: 1, note: "" };
  });
  const confirmedSeat = new Map(confirmedAttendees.flatMap((attendee, index) => attendee.seatId ? [[attendee.seatId, attendeeRows[index]] as const] : []));
  const confirmedByCategory = new Map<string, number>();
  for (const attendee of confirmedAttendees) if (attendee.ticketCategoryId) confirmedByCategory.set(attendee.ticketCategoryId, (confirmedByCategory.get(attendee.ticketCategoryId) ?? 0) + 1);
  const heldSeats = new Set(input.holds.map((hold) => hold.seatId).filter(Boolean));
  const categoryHeld = new Map<string, number>();
  for (const hold of input.holds) if (hold.ticketCategoryId) categoryHeld.set(hold.ticketCategoryId, (categoryHeld.get(hold.ticketCategoryId) ?? 0) + hold.quantity);
  const inventory: AnalyticsRow[] = input.admissionMode === "selectable" ? input.seats.map((seat) => {
    const owner = confirmedSeat.get(seat.id);
    const status = owner ? "booked" : seat.status === "available" && heldSeats.has(seat.id) ? "held" : seat.status;
    return { id: seat.id, name: owner?.name ?? seat.reservedFor ?? "", table: seat.table, seat: seat.label, band: seat.band, priceMinor: owner?.priceMinor ?? seat.priceMinor, status, confirmed: Boolean(owner), checkedInAt: owner?.checkedInAt ?? null, bookingCode: owner?.bookingCode ?? null, attendeeId: owner?.attendeeId ?? null, quantity: 1, available: status === "available" ? 1 : 0, confirmedCount: owner ? 1 : 0, note: seat.blockedReason ?? "" };
  }) : input.categories.map((category) => {
    const confirmedCount = confirmedByCategory.get(category.id) ?? 0;
    const available = Math.max(0, category.quantityAvailable - category.quantitySold - (categoryHeld.get(category.id) ?? 0));
    return { id: category.id, name: "", table: "", seat: "", band: category.name, priceMinor: category.priceMinor, status: available ? "available" : "unavailable", confirmed: false, checkedInAt: null, bookingCode: null, attendeeId: null, quantity: category.quantityAvailable, available, confirmedCount, note: `${Math.max(0, category.quantityAvailable - available - confirmedCount)} held or pending` };
  });
  const paid = input.bookings.filter((booking) => booking.status === "confirmed" && booking.paymentStatus === "paid");
  const paidIds = new Set(paid.map((booking) => booking.id));
  const paidAttendees = confirmedAttendees.filter((attendee) => paidIds.has(attendee.bookingId));
  const day = (date: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: input.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
  const daily = new Map<string, { date: string; revenueMinor: number; confirmed: number; checkedIn: number }>();
  const bucket = (date: string | Date) => { const key = day(date); if (!daily.has(key)) daily.set(key, { date: key, revenueMinor: 0, confirmed: 0, checkedIn: 0 }); return daily.get(key)!; };
  for (const booking of paid) bucket(booking.confirmedAt ?? booking.createdAt).revenueMinor += booking.totalMinor;
  for (const attendee of confirmedAttendees) {
    const booking = bookingById.get(attendee.bookingId)!;
    bucket(booking.confirmedAt ?? booking.createdAt).confirmed++;
    if (attendee.checkedInAt) bucket(attendee.checkedInAt).checkedIn++;
  }
  const bands = new Map<string, { name: string; confirmed: number; checkedIn: number; revenueMinor: number }>();
  for (const attendee of confirmedAttendees) {
    const band = bands.get(attendee.priceBandName) ?? { name: attendee.priceBandName, confirmed: 0, checkedIn: 0, revenueMinor: 0 };
    band.confirmed++;
    if (attendee.checkedInAt) band.checkedIn++;
    if (paidIds.has(attendee.bookingId)) band.revenueMinor += attendee.priceMinor;
    bands.set(band.name, band);
  }
  return {
    inventory, attendees: attendeeRows,
    summary: {
      capacity: inventory.reduce((sum, row) => sum + row.quantity, 0),
      available: inventory.reduce((sum, row) => sum + row.available, 0),
      confirmed: attendeeRows.length,
      checkedIn: attendeeRows.filter((row) => row.checkedInAt).length,
      totalValueMinor: input.admissionMode === "selectable" ? input.seats.reduce((sum, seat) => sum + seat.priceMinor, 0) : input.categories.reduce((sum, category) => sum + category.priceMinor * category.quantityAvailable, 0),
      availableValueMinor: inventory.reduce((sum, row) => sum + row.priceMinor * row.available, 0),
      collectedMinor: paid.reduce((sum, booking) => sum + booking.totalMinor, 0),
      confirmedTicketValueMinor: paidAttendees.reduce((sum, attendee) => sum + attendee.priceMinor, 0),
      checkedInValueMinor: paidAttendees.filter((attendee) => attendee.checkedInAt).reduce((sum, attendee) => sum + attendee.priceMinor, 0),
    },
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    bands: [...bands.values()].sort((a, b) => b.confirmed - a.confirmed),
  };
}

export type EventAnalyticsData = ReturnType<typeof buildEventAnalytics>;
