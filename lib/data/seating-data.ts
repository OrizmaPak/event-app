import type { Booking, LayoutObject, PriceBand, SeatRecord } from "./types";

export const demoPriceBands: PriceBand[] = [
  { id: "band-vip", name: "VIP", price: 50000, color: "#7557ff" },
  { id: "band-premium", name: "Premium", price: 25000, color: "#078b9a" },
  { id: "band-standard", name: "Standard", price: 12000, color: "#d28a28" },
  { id: "band-complimentary", name: "Complimentary", price: 0, color: "#27845b" },
];

export const demoLayoutObjects: LayoutObject[] = [
  { id: "stage-main", type: "stage", label: "Main stage", x: 26, y: 7, width: 48, height: 12, rotation: 0, seatCount: 0 },
  { id: "table-01", type: "round-table", label: "Table 01", x: 10, y: 29, width: 24, height: 30, rotation: 0, seatCount: 8, priceBandId: "band-vip" },
  { id: "table-02", type: "round-table", label: "Table 02", x: 39, y: 29, width: 24, height: 30, rotation: 0, seatCount: 8, priceBandId: "band-premium" },
  { id: "table-03", type: "round-table", label: "Table 03", x: 68, y: 29, width: 24, height: 30, rotation: 0, seatCount: 8, priceBandId: "band-standard" },
  { id: "row-a", type: "row", label: "Row A", x: 18, y: 72, width: 64, height: 14, rotation: 0, seatCount: 8, priceBandId: "band-standard" },
  { id: "aisle-main", type: "aisle", label: "Central aisle", x: 47, y: 22, width: 6, height: 66, rotation: 0, seatCount: 0 },
];

function seatLabel(object: LayoutObject, index: number) {
  const number = String(index + 1).padStart(2, "0");
  return object.type === "row" ? `${object.label} · Seat ${number}` : `${object.label} · Seat ${number}`;
}

export function createSeats(objects: LayoutObject[] = demoLayoutObjects): SeatRecord[] {
  return objects.flatMap((object) => Array.from({ length: object.seatCount }, (_, index) => {
    const id = `${object.id}-seat-${String(index + 1).padStart(2, "0")}`;
    const status: SeatRecord["status"] = id === "table-01-seat-03" ? "booked" : id === "table-02-seat-06" ? "reserved" : id === "table-03-seat-04" ? "blocked" : "available";
    return {
      id,
      eventId: "evt_lumina",
      objectId: object.id,
      label: seatLabel(object, index),
      shortLabel: String(index + 1).padStart(2, "0"),
      priceBandId: object.priceBandId ?? "band-standard",
      status,
      reservedFor: status === "reserved" ? "Nneka Eze" : undefined,
      blockedReason: status === "blocked" ? "Accessibility companion" : undefined,
    };
  }));
}

export const demoSeats = createSeats();

export const fallbackBooking: Booking = {
  id: "booking-lum-2408",
  eventId: "evt_lumina",
  code: "LUM-GROUP-2408",
  qrToken: "demo://lumina/booking-lum-2408",
  buyerName: "Amara Okafor",
  buyerEmail: "amara@example.com",
  buyerPhone: "+234 803 555 0101",
  currency: "NGN",
  admissionMode: "selectable",
  attendees: [
    { id: "att-amara", name: "Amara Okafor", seatId: "table-01-seat-04", seatLabel: "Table 01 · Seat 04", priceBandName: "VIP", price: 50000 },
    { id: "att-tobi", name: "Tobi Adeyemi", seatId: "table-01-seat-05", seatLabel: "Table 01 · Seat 05", priceBandName: "VIP", price: 50000 },
    { id: "att-zainab", name: "Zainab Ibrahim", seatId: "table-02-seat-04", seatLabel: "Table 02 · Seat 04", priceBandName: "Premium", price: 25000 },
  ],
  subtotal: 125000,
  fees: 2500,
  total: 127500,
  paymentStatus: "paid",
  createdAt: "12 Aug 2026, 10:24",
};

export function formatMoney(amount: number, currency = "NGN") {
  if (amount === 0) return "Free";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function compactMoney(amount: number) {
  if (amount === 0) return "Free";
  return amount >= 1000 ? `₦${Math.round(amount / 1000)}k` : `₦${amount}`;
}
