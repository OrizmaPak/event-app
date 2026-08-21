import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { EventPageConfig } from "@/lib/data/types";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const organizers = pgTable("organizers", {
  id: uuid("id").defaultRandom().primaryKey(), slug: text("slug").notNull(), name: text("name").notNull(), email: text("email").notNull(), phone: text("phone"), profile: jsonb("profile").$type<Record<string, unknown>>().default({}).notNull(), createdAt, updatedAt,
}, (table) => [uniqueIndex("organizers_slug_uidx").on(table.slug), uniqueIndex("organizers_email_uidx").on(table.email)]);

export const organizerMembers = pgTable("organizer_members", {
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }), userKey: text("user_key").notNull(), email: text("email").notNull(), role: text("role").notNull().default("owner"), status: text("status").notNull().default("active"), createdAt,
}, (table) => [primaryKey({ columns: [table.organizerId, table.userKey] }), index("organizer_members_email_idx").on(table.email)]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(), organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }), slug: text("slug").notNull(), title: text("title").notNull(), shortTitle: text("short_title").notNull(), eyebrow: text("eyebrow").notNull().default(""), description: text("description").notNull().default(""), longDescription: text("long_description").notNull().default(""), category: text("category").notNull(), status: text("status").notNull().default("draft"), visibility: text("visibility").notNull().default("public"), privateListing: text("private_listing"), pricingMode: text("pricing_mode").notNull().default("free"), admissionMode: text("admission_mode").notNull().default("general"), currency: text("currency").notNull().default("NGN"), startAt: timestamp("start_at", { withTimezone: true }).notNull(), endAt: timestamp("end_at", { withTimezone: true }), timezone: text("timezone").notNull().default("Africa/Lagos"), venue: text("venue").notNull(), address: text("address").notNull(), city: text("city").notNull(), capacity: integer("capacity").notNull().default(0), bookingLimit: integer("booking_limit"), accent: text("accent").notNull().default("#7557ff"), cover: text("cover").notNull().default("violet"), createdAt, updatedAt, publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [uniqueIndex("events_slug_uidx").on(table.slug), index("events_discovery_idx").on(table.status, table.visibility, table.privateListing, table.startAt), index("events_organizer_idx").on(table.organizerId)]);

export const eventPages = pgTable("event_pages", {
  eventId: uuid("event_id").primaryKey().references(() => events.id, { onDelete: "cascade" }), config: jsonb("config").$type<EventPageConfig>().notNull(), version: integer("version").notNull().default(1), updatedAt,
});

export const registrationQuestions = pgTable("registration_questions", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }), label: text("label").notNull(), type: text("type").notNull(), scope: text("scope").notNull(), required: boolean("required").notNull().default(false), placeholder: text("placeholder"), helpText: text("help_text"), options: jsonb("options").$type<string[]>().default([]).notNull(), validation: jsonb("validation").$type<Record<string, unknown>>().default({}).notNull(), sortOrder: integer("sort_order").notNull().default(0), createdAt, updatedAt,
}, (table) => [index("registration_questions_event_idx").on(table.eventId, table.sortOrder)]);

export const ticketCategories = pgTable("ticket_categories", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }), name: text("name").notNull(), description: text("description").notNull().default(""), priceMinor: integer("price_minor").notNull().default(0), quantityAvailable: integer("quantity_available").notNull(), quantitySold: integer("quantity_sold").notNull().default(0), color: text("color").notNull().default("#7557ff"), sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [index("ticket_categories_event_idx").on(table.eventId, table.sortOrder)]);

export const priceBands = pgTable("price_bands", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }), name: text("name").notNull(), priceMinor: integer("price_minor").notNull().default(0), color: text("color").notNull(),
}, (table) => [index("price_bands_event_idx").on(table.eventId)]);

export const layoutObjects = pgTable("layout_objects", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }), type: text("type").notNull(), label: text("label").notNull(), presentation: jsonb("presentation").$type<Record<string, unknown>>().notNull(), sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [index("layout_objects_event_idx").on(table.eventId)]);

export const seats = pgTable("seats", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }), layoutObjectId: uuid("layout_object_id").notNull().references(() => layoutObjects.id, { onDelete: "cascade" }), stableKey: text("stable_key").notNull(), label: text("label").notNull(), shortLabel: text("short_label").notNull(), priceBandId: uuid("price_band_id").references(() => priceBands.id, { onDelete: "set null" }), priceOverrideMinor: integer("price_override_minor"), status: text("status").notNull().default("available"), reservedFor: text("reserved_for"), blockedReason: text("blocked_reason"),
}, (table) => [uniqueIndex("seats_event_stable_key_uidx").on(table.eventId, table.stableKey), index("seats_inventory_idx").on(table.eventId, table.status)]);

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }), guestName: text("guest_name").notNull(), email: text("email").notNull(), emailNormalized: text("email_normalized").notNull(), phone: text("phone"), partyAllowance: integer("party_allowance").notNull().default(1), codeHash: text("code_hash").notNull(), personalization: jsonb("personalization").$type<Record<string, unknown>>().default({}).notNull(), status: text("status").notNull().default("pending"), deliveryStatus: text("delivery_status").notNull().default("draft"), expiresAt: timestamp("expires_at", { withTimezone: true }), lastSentAt: timestamp("last_sent_at", { withTimezone: true }), respondedAt: timestamp("responded_at", { withTimezone: true }), revokedAt: timestamp("revoked_at", { withTimezone: true }), createdAt, updatedAt,
}, (table) => [uniqueIndex("invitations_event_email_uidx").on(table.eventId, table.emailNormalized), index("invitations_event_status_idx").on(table.eventId, table.status), index("invitations_code_hash_idx").on(table.codeHash)]);

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "restrict" }), invitationId: uuid("invitation_id").references(() => invitations.id, { onDelete: "set null" }), code: text("code").notNull(), qrTokenHash: text("qr_token_hash").notNull(), buyerName: text("buyer_name").notNull(), buyerEmail: text("buyer_email").notNull(), buyerPhone: text("buyer_phone"), currency: text("currency").notNull(), subtotalMinor: integer("subtotal_minor").notNull(), feesMinor: integer("fees_minor").notNull().default(0), totalMinor: integer("total_minor").notNull(), paymentStatus: text("payment_status").notNull(), answers: jsonb("answers").$type<Record<string, unknown>>().default({}).notNull(), createdAt, updatedAt,
}, (table) => [uniqueIndex("bookings_code_uidx").on(table.code), index("bookings_event_idx").on(table.eventId)]);

export const bookingAttendees = pgTable("booking_attendees", {
  id: uuid("id").defaultRandom().primaryKey(), bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }), ticketCategoryId: uuid("ticket_category_id").references(() => ticketCategories.id, { onDelete: "set null" }), seatId: uuid("seat_id").references(() => seats.id, { onDelete: "set null" }), name: text("name").notNull(), email: text("email"), phone: text("phone"), priceMinor: integer("price_minor").notNull(), priceBandName: text("price_band_name").notNull(), answers: jsonb("answers").$type<Record<string, unknown>>().default({}).notNull(), createdAt,
}, (table) => [index("booking_attendees_booking_idx").on(table.bookingId), uniqueIndex("booking_attendees_seat_uidx").on(table.seatId)]);

export const paymentAttempts = pgTable("payment_attempts", {
  id: uuid("id").defaultRandom().primaryKey(), bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }), provider: text("provider").notNull().default("mock"), providerReference: text("provider_reference"), amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull(), status: text("status").notNull(), idempotencyKey: text("idempotency_key").notNull(), failureReason: text("failure_reason"), createdAt,
}, (table) => [uniqueIndex("payment_attempts_idempotency_uidx").on(table.idempotencyKey), index("payment_attempts_booking_idx").on(table.bookingId)]);

export const checkIns = pgTable("check_ins", {
  id: uuid("id").defaultRandom().primaryKey(), bookingAttendeeId: uuid("booking_attendee_id").notNull().references(() => bookingAttendees.id, { onDelete: "cascade" }), entrance: text("entrance").notNull(), staffKey: text("staff_key"), checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("check_ins_attendee_uidx").on(table.bookingAttendeeId)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(), organizerId: uuid("organizer_id").references(() => organizers.id, { onDelete: "cascade" }), eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }), invitationId: uuid("invitation_id").references(() => invitations.id, { onDelete: "cascade" }), type: text("type").notNull(), title: text("title").notNull(), body: text("body").notNull(), data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(), readAt: timestamp("read_at", { withTimezone: true }), createdAt,
}, (table) => [index("notifications_organizer_idx").on(table.organizerId, table.createdAt)]);

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(), notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }), channel: text("channel").notNull(), recipient: text("recipient").notNull(), subject: text("subject"), content: text("content").notNull(), status: text("status").notNull().default("queued"), providerReference: text("provider_reference"), attemptCount: integer("attempt_count").notNull().default(0), lastError: text("last_error"), createdAt, sentAt: timestamp("sent_at", { withTimezone: true }),
}, (table) => [index("notification_deliveries_outbox_idx").on(table.status, table.createdAt)]);

