import assert from "node:assert/strict";
import test from "node:test";
import { buildEventAnalytics, type AnalyticsInput } from "../lib/data/event-analytics";

const date = new Date("2026-10-19T23:30:00Z");
function fixture(): AnalyticsInput {
  return {
    admissionMode: "selectable", timezone: "Africa/Lagos", categories: [],
    seats: ["booked", "booked", "available", "available", "reserved", "blocked", "held"].map((status, i) => ({ id: `s${i}`, label: `Seat ${i + 1}`, table: "Table A", band: "Standard", priceMinor: i === 1 ? 0 : 10000, status, reservedFor: status === "reserved" ? "Host" : null, blockedReason: status === "blocked" ? "Equipment" : null })),
    bookings: [
      { id: "b1", code: "BOOK1", status: "confirmed", paymentStatus: "paid", totalMinor: 10000, createdAt: date, confirmedAt: date },
      { id: "b2", code: "BOOK2", status: "awaiting_payment", paymentStatus: "pending", totalMinor: 10000, createdAt: date, confirmedAt: null },
      { id: "b3", code: "BOOK3", status: "cancelled", paymentStatus: "pending", totalMinor: 10000, createdAt: date, confirmedAt: null },
    ],
    attendees: [
      { id: "a1", bookingId: "b1", name: "Paid guest", seatId: "s0", ticketCategoryId: null, priceMinor: 10000, priceBandName: "Standard", checkedInAt: date.toISOString() },
      { id: "a2", bookingId: "b1", name: "Companion", seatId: "s1", ticketCategoryId: null, priceMinor: 0, priceBandName: "Complimentary", checkedInAt: null },
      { id: "a3", bookingId: "b2", name: "Unpaid guest", seatId: "s6", ticketCategoryId: null, priceMinor: 10000, priceBandName: "Standard", checkedInAt: null },
      { id: "a4", bookingId: "b3", name: "Cancelled guest", seatId: "s2", ticketCategoryId: null, priceMinor: 10000, priceBandName: "Standard", checkedInAt: null },
    ],
    holds: [{ seatId: "s3", ticketCategoryId: null, quantity: 1 }],
  };
}

test("confirmation includes all group attendees independent of check-in; payment and admissions count once", () => {
  const result = buildEventAnalytics(fixture());
  assert.equal(result.summary.confirmed, 2);
  assert.equal(result.summary.checkedIn, 1);
  assert.equal(result.summary.collectedMinor, 10000);
  assert.equal(result.summary.checkedInValueMinor, 10000);
  assert.equal(result.summary.confirmedTicketValueMinor, 10000);
  assert.equal(result.attendees[1].confirmed, true);
  assert.equal(result.attendees[1].checkedInAt, null);
  assert.equal(result.attendees[0].table, "Table A");
  assert.equal(result.attendees[0].bookingCode, "BOOK1");
});

test("available seats exclude active holds, reserved, blocked and pending-payment seats", () => {
  const result = buildEventAnalytics(fixture());
  assert.equal(result.summary.capacity, 7);
  assert.equal(result.summary.available, 1);
  assert.equal(result.summary.totalValueMinor, 60000);
  assert.equal(result.summary.availableValueMinor, 10000);
  assert.equal(result.inventory.find((row) => row.id === "s3")?.status, "held");
  assert.equal(result.inventory.find((row) => row.id === "s4")?.name, "Host");
  assert.equal(result.inventory.find((row) => row.id === "s2")?.name, "");
});

test("general and assigned admission use category capacity, without duplicating seats", () => {
  for (const admissionMode of ["general", "assigned"]) {
    const input = fixture();
    input.admissionMode = admissionMode;
    input.categories = [{ id: "cat", name: "Admission", priceMinor: 10000, quantityAvailable: 20, quantitySold: 3 }];
    input.attendees.forEach((attendee) => { attendee.ticketCategoryId = "cat"; });
    input.holds = [{ seatId: null, ticketCategoryId: "cat", quantity: 2 }];
    const result = buildEventAnalytics(input);
    assert.equal(result.summary.capacity, 20);
    assert.equal(result.summary.available, 15);
    assert.equal(result.summary.totalValueMinor, 200000);
    assert.equal(result.inventory.length, 1);
    assert.equal(result.inventory[0].confirmedCount, 2);
    assert.equal(result.summary.confirmed, 2);
  }
});

test("free admissions count as confirmations with no collected revenue", () => {
  const input = fixture();
  input.bookings[0].paymentStatus = "not_required";
  input.bookings[0].totalMinor = 0;
  input.attendees[0].priceMinor = 0;
  const result = buildEventAnalytics(input);
  assert.equal(result.summary.confirmed, 2);
  assert.equal(result.summary.checkedIn, 1);
  assert.equal(result.summary.collectedMinor, 0);
  assert.equal(result.summary.checkedInValueMinor, 0);
});

test("daily activity uses event timezone and includes admissions separately from sales", () => {
  const result = buildEventAnalytics(fixture());
  assert.deepEqual(result.daily, [{ date: "2026-10-20", revenueMinor: 10000, confirmed: 2, checkedIn: 1 }]);
  assert.equal(result.bands.find((band) => band.name === "Complimentary")?.revenueMinor, 0);
});

test("empty events return empty tables and finite zero summaries", () => {
  const result = buildEventAnalytics({ admissionMode: "general", timezone: "Africa/Lagos", seats: [], categories: [], bookings: [], attendees: [], holds: [] });
  assert.deepEqual(result.daily, []);
  assert.deepEqual(result.inventory, []);
  for (const value of Object.values(result.summary)) assert.equal(value, 0);
});
