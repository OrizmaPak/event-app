import { and, asc, eq, or } from "drizzle-orm";
import { eventPages, events as eventRows } from "@/db/schema";
import { events as mockEvents } from "@/lib/data/mock-data";
import type { AdmissionMode, EventCategory, EventPageConfig, EventRecord, EventStatus, PricingMode } from "@/lib/data/types";
import { getDatabase } from "./client";

type EventRow = typeof eventRows.$inferSelect;

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
  const [result] = await getDatabase().select({ event: eventRows, page: eventPages.config }).from(eventRows).leftJoin(eventPages, eq(eventRows.id, eventPages.eventId)).where(eq(eventRows.slug, slug)).limit(1);
  return result ? toEventRecord(result.event, result.page) : null;
}

export async function listDatabaseDiscoveryEvents() {
  const rows = await getDatabase().select({ event: eventRows, page: eventPages.config }).from(eventRows).leftJoin(eventPages, eq(eventRows.id, eventPages.eventId)).where(and(eq(eventRows.status, "published"), or(eq(eventRows.visibility, "public"), and(eq(eventRows.visibility, "private"), eq(eventRows.privateListing, "listed"))))).orderBy(asc(eventRows.startAt));
  return rows.map((row) => toEventRecord(row.event, row.page));
}
