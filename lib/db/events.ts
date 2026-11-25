import { and, asc, eq, or, sql } from "drizzle-orm";
import { cache } from "react";
import { eventPages, events as eventRows } from "@/db/schema";
import { events as mockEvents } from "@/lib/data/mock-data";
import type { AdmissionMode, EventCategory, EventPageConfig, EventRecord, EventStatus, PricingMode } from "@/lib/data/types";
import { getDatabase } from "./client";

type EventRow = typeof eventRows.$inferSelect;
const eventCounts = {
  confirmed: sql<number>`(select count(*)::int from booking_attendees a join bookings b on b.id = a.booking_id where b.event_id = ${eventRows.id} and b.status = 'confirmed')`,
  checkedIn: sql<number>`(select count(*)::int from check_ins c join booking_attendees a on a.id = c.booking_attendee_id join bookings b on b.id = a.booking_id where b.event_id = ${eventRows.id} and c.reversed_at is null)`,
  tableCount: sql<number>`(select count(*)::int from layout_objects l where l.event_id = ${eventRows.id} and l.type in ('round-table', 'rectangle-table'))`,
};
function withCounts(record: EventRecord, counts: { confirmed: number; checkedIn: number; tableCount: number }) {
  return { ...record, ...counts, responseRate: record.capacity ? Math.round(counts.confirmed / record.capacity * 100) : 0 };
}

function toEventRecord(row: EventRow, page: EventPageConfig | null): EventRecord {
  const mock = mockEvents.find((event) => event.slug === row.slug);
  const dateLabel = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: row.timezone }).format(row.startAt);
  const start = new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", timeZone: row.timezone }).format(row.startAt);
  const end = row.endAt ? new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", timeZone: row.timezone }).format(row.endAt) : null;
  return {
    id: row.id, slug: row.slug, organizerId: row.organizerId, title: row.title, shortTitle: row.shortTitle, eyebrow: row.eyebrow, description: row.description, longDescription: row.longDescription, dateISO: row.startAt.toISOString(), dateLabel, timeLabel: end ? `${start} – ${end}` : start, venue: row.venue, address: row.address, city: row.city, category: row.category as EventCategory, capacity: row.capacity, confirmed: mock?.confirmed ?? 0, checkedIn: mock?.checkedIn ?? 0, status: row.status as EventStatus, visibility: row.visibility as "public" | "private", privateListing: row.privateListing as "listed" | "unlisted" | undefined, cover: row.cover as EventRecord["cover"], accent: row.accent, tableCount: mock?.tableCount ?? 0, responseRate: mock?.responseRate ?? 0, pricingMode: row.pricingMode as PricingMode, admissionMode: row.admissionMode as AdmissionMode, currency: row.currency, bookingLimit: row.bookingLimit, featured: mock?.featured, eventPage: page ?? mock?.eventPage,
  };
}

export async function getDatabaseEvent(slug: string) {
  const [result] = await getDatabase().select({ event: eventRows, page: eventPages.config, ...eventCounts }).from(eventRows).leftJoin(eventPages, eq(eventRows.id, eventPages.eventId)).where(eq(eventRows.slug, slug)).limit(1);
  return result ? withCounts(toEventRecord(result.event, result.page), { confirmed: result.confirmed, checkedIn: result.checkedIn, tableCount: result.tableCount }) : null;
}

export async function listDatabaseDiscoveryEvents() {
  const rows = await getDatabase().select({ event: eventRows, page: eventPages.config }).from(eventRows).leftJoin(eventPages, eq(eventRows.id, eventPages.eventId)).where(and(eq(eventRows.status, "published"), or(eq(eventRows.visibility, "public"), and(eq(eventRows.visibility, "private"), eq(eventRows.privateListing, "listed"))))).orderBy(asc(eventRows.startAt));
  return rows.map((row) => toEventRecord(row.event, row.page));
}

export const listDatabaseOrganizerEvents = cache(async function listDatabaseOrganizerEvents(organizerId: string) {
  const rows = await getDatabase().select({ event: eventRows, page: eventPages.config, ...eventCounts }).from(eventRows).leftJoin(eventPages, eq(eventRows.id, eventPages.eventId)).where(eq(eventRows.organizerId, organizerId)).orderBy(asc(eventRows.startAt));
  return rows.map((row) => withCounts(toEventRecord(row.event, row.page), { confirmed: row.confirmed, checkedIn: row.checkedIn, tableCount: row.tableCount }));
});
