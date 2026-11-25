import { bigint, boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { EventPageConfig } from "@/lib/data/types";
import type { ResourceContent } from "@/lib/resources/model";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const organizers = pgTable("organizers", {
  id: uuid("id").defaultRandom().primaryKey(), slug: text("slug").notNull(), name: text("name").notNull(), email: text("email").notNull(), phone: text("phone"), status: text("status").notNull().default("pending"), autoEventApproval: boolean("auto_event_approval").notNull().default(false), profile: jsonb("profile").$type<Record<string, unknown>>().default({}).notNull(), createdAt, updatedAt,
}, (table) => [uniqueIndex("organizers_slug_uidx").on(table.slug), uniqueIndex("organizers_email_uidx").on(table.email)]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("pending_verification"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt,
  updatedAt,
}, (table) => [uniqueIndex("users_email_normalized_uidx").on(table.emailNormalized), index("users_status_idx").on(table.status)]);

export const passwordCredentials = pgTable("password_credentials", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  hashVersion: integer("hash_version").notNull().default(1),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt,
}, (table) => [uniqueIndex("user_sessions_token_hash_uidx").on(table.tokenHash), index("user_sessions_user_idx").on(table.userId, table.expiresAt)]);

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt,
}, (table) => [uniqueIndex("auth_tokens_hash_uidx").on(table.tokenHash), index("auth_tokens_user_purpose_idx").on(table.userId, table.purpose)]);

export const mfaFactors = pgTable("mfa_factors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("totp"),
  secretEncrypted: text("secret_encrypted").notNull(),
  label: text("label").notNull().default("Authenticator"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdAt,
}, (table) => [index("mfa_factors_user_idx").on(table.userId)]);

export const mfaRecoveryCodes = pgTable("mfa_recovery_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt,
}, (table) => [uniqueIndex("mfa_recovery_codes_hash_uidx").on(table.codeHash), index("mfa_recovery_codes_user_idx").on(table.userId)]);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  system: boolean("system").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdAt,
  updatedAt,
}, (table) => [uniqueIndex("roles_organizer_key_uidx").on(table.organizerId, table.key), index("roles_organizer_status_idx").on(table.organizerId, table.status)]);

export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  group: text("group_name").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  sensitive: boolean("sensitive").notNull().default(false),
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionKey: text("permission_key").notNull().references(() => permissions.key, { onDelete: "cascade" }),
  createdAt,
}, (table) => [primaryKey({ columns: [table.roleId, table.permissionKey] })]);

export const organizerMembers = pgTable("organizer_members", {
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }), userKey: text("user_key").notNull(), userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), email: text("email").notNull(), role: text("role").notNull().default("owner"), roleId: uuid("role_id").references(() => roles.id, { onDelete: "set null" }), eventScope: text("event_scope").notNull().default("all"), status: text("status").notNull().default("active"), invitedAt: timestamp("invited_at", { withTimezone: true }), acceptedAt: timestamp("accepted_at", { withTimezone: true }), createdAt,
}, (table) => [primaryKey({ columns: [table.organizerId, table.userKey] }), index("organizer_members_email_idx").on(table.email)]);

export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull(),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "restrict" }),
  eventScope: text("event_scope").notNull().default("all"),
  tokenHash: text("token_hash").notNull(),
  invitedBy: uuid("invited_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt,
}, (table) => [uniqueIndex("workspace_invitations_active_email_uidx").on(table.organizerId, table.emailNormalized).where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`), uniqueIndex("workspace_invitations_token_uidx").on(table.tokenHash)]);

export const memberPermissionOverrides = pgTable("member_permission_overrides", {
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permissionKey: text("permission_key").notNull().references(() => permissions.key, { onDelete: "cascade" }),
  effect: text("effect").notNull(),
  createdAt,
  updatedAt,
}, (table) => [primaryKey({ columns: [table.organizerId, table.userId, table.permissionKey] }), index("member_permission_overrides_user_idx").on(table.userId)]);

export const eventStaffAssignments = pgTable("event_staff_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessCodeHash: text("access_code_hash"),
  accessCodeEncrypted: text("access_code_encrypted"),
  entrance: text("entrance"),
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt,
}, (table) => [uniqueIndex("event_staff_assignment_uidx").on(table.eventId, table.userId), uniqueIndex("event_staff_access_code_hash_uidx").on(table.accessCodeHash).where(sql`${table.accessCodeHash} is not null`), index("event_staff_user_idx").on(table.userId, table.status)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").references(() => organizers.id, { onDelete: "set null" }),
  eventId: uuid("event_id"),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  reason: text("reason"),
  requestId: text("request_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt,
}, (table) => [index("audit_logs_organizer_idx").on(table.organizerId, table.createdAt), index("audit_logs_actor_idx").on(table.actorUserId, table.createdAt)]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(), organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }), createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }), slug: text("slug").notNull(), title: text("title").notNull(), shortTitle: text("short_title").notNull(), eyebrow: text("eyebrow").notNull().default(""), description: text("description").notNull().default(""), longDescription: text("long_description").notNull().default(""), category: text("category").notNull(), status: text("status").notNull().default("draft"), visibility: text("visibility").notNull().default("public"), privateListing: text("private_listing"), pricingMode: text("pricing_mode").notNull().default("free"), admissionMode: text("admission_mode").notNull().default("general"), currency: text("currency").notNull().default("NGN"), platformFeeBps: integer("platform_fee_bps").notNull().default(500), payoutDelayDays: integer("payout_delay_days").notNull().default(2), startAt: timestamp("start_at", { withTimezone: true }).notNull(), endAt: timestamp("end_at", { withTimezone: true }), timezone: text("timezone").notNull().default("Africa/Lagos"), venue: text("venue").notNull(), address: text("address").notNull(), city: text("city").notNull(), capacity: integer("capacity").notNull().default(0), bookingLimit: integer("booking_limit"), accent: text("accent").notNull().default("#7557ff"), cover: text("cover").notNull().default("violet"), createdAt, updatedAt, publishedAt: timestamp("published_at", { withTimezone: true }),
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

export const inventoryHolds = pgTable("inventory_holds", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  seatId: uuid("seat_id").references(() => seats.id, { onDelete: "cascade" }),
  ticketCategoryId: uuid("ticket_category_id").references(() => ticketCategories.id, { onDelete: "cascade" }),
  holdTokenHash: text("hold_token_hash").notNull(),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  createdAt,
}, (table) => [uniqueIndex("inventory_holds_seat_active_uidx").on(table.seatId).where(sql`${table.status} = 'active' and ${table.seatId} is not null`), index("inventory_holds_expiry_idx").on(table.status, table.expiresAt), index("inventory_holds_token_idx").on(table.holdTokenHash)]);

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }), guestName: text("guest_name").notNull(), email: text("email").notNull(), emailNormalized: text("email_normalized").notNull(), phone: text("phone"), partyAllowance: integer("party_allowance").notNull().default(1), codeHash: text("code_hash").notNull(), personalization: jsonb("personalization").$type<Record<string, unknown>>().default({}).notNull(), status: text("status").notNull().default("pending"), deliveryStatus: text("delivery_status").notNull().default("draft"), expiresAt: timestamp("expires_at", { withTimezone: true }), lastSentAt: timestamp("last_sent_at", { withTimezone: true }), respondedAt: timestamp("responded_at", { withTimezone: true }), revokedAt: timestamp("revoked_at", { withTimezone: true }), createdAt, updatedAt,
}, (table) => [uniqueIndex("invitations_event_email_uidx").on(table.eventId, table.emailNormalized), index("invitations_event_status_idx").on(table.eventId, table.status), index("invitations_code_hash_idx").on(table.codeHash)]);

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(), eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "restrict" }), invitationId: uuid("invitation_id").references(() => invitations.id, { onDelete: "set null" }), code: text("code").notNull(), qrTokenHash: text("qr_token_hash").notNull(), qrTokenEncrypted: text("qr_token_encrypted").notNull().default(""), managementTokenHash: text("management_token_hash").notNull().default(""), idempotencyKey: text("idempotency_key").notNull().default(""), status: text("status").notNull().default("pending"), buyerName: text("buyer_name").notNull(), buyerEmail: text("buyer_email").notNull(), buyerPhone: text("buyer_phone"), currency: text("currency").notNull(), subtotalMinor: integer("subtotal_minor").notNull(), feesMinor: integer("fees_minor").notNull().default(0), platformFeeMinor: integer("platform_fee_minor").notNull().default(0), totalMinor: integer("total_minor").notNull(), paymentStatus: text("payment_status").notNull(), answers: jsonb("answers").$type<Record<string, unknown>>().default({}).notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }), confirmedAt: timestamp("confirmed_at", { withTimezone: true }), createdAt, updatedAt,
}, (table) => [uniqueIndex("bookings_code_uidx").on(table.code), uniqueIndex("bookings_idempotency_uidx").on(table.idempotencyKey), index("bookings_event_idx").on(table.eventId)]);

export const bookingAttendees = pgTable("booking_attendees", {
  id: uuid("id").defaultRandom().primaryKey(), bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }), ticketCategoryId: uuid("ticket_category_id").references(() => ticketCategories.id, { onDelete: "set null" }), seatId: uuid("seat_id").references(() => seats.id, { onDelete: "set null" }), name: text("name").notNull(), email: text("email"), phone: text("phone"), priceMinor: integer("price_minor").notNull(), priceBandName: text("price_band_name").notNull(), answers: jsonb("answers").$type<Record<string, unknown>>().default({}).notNull(), createdAt,
}, (table) => [index("booking_attendees_booking_idx").on(table.bookingId), index("booking_attendees_seat_idx").on(table.seatId)]);

export const paymentAttempts = pgTable("payment_attempts", {
  id: uuid("id").defaultRandom().primaryKey(), bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }), provider: text("provider").notNull().default("mock"), providerReference: text("provider_reference"), amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull(), status: text("status").notNull(), idempotencyKey: text("idempotency_key").notNull(), failureReason: text("failure_reason"), createdAt,
}, (table) => [uniqueIndex("payment_attempts_idempotency_uidx").on(table.idempotencyKey), index("payment_attempts_booking_idx").on(table.bookingId)]);

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  provider: text("provider").notNull().default("paystack"),
  providerReference: text("provider_reference").notNull(),
  type: text("type").notNull().default("charge"),
  status: text("status").notNull().default("pending"),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  providerFeeMinor: bigint("provider_fee_minor", { mode: "number" }).notNull().default(0),
  platformFeeMinor: bigint("platform_fee_minor", { mode: "number" }).notNull().default(0),
  organizerNetMinor: bigint("organizer_net_minor", { mode: "number" }).notNull().default(0),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  raw: jsonb("raw").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt,
  updatedAt,
}, (table) => [uniqueIndex("payment_transactions_provider_ref_uidx").on(table.provider, table.providerReference), index("payment_transactions_booking_idx").on(table.bookingId)]);

export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  eventType: text("event_type").notNull(),
  signatureValid: boolean("signature_valid").notNull().default(false),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("received"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
  createdAt,
}, (table) => [uniqueIndex("payment_webhook_provider_event_uidx").on(table.provider, table.providerEventId), index("payment_webhook_status_idx").on(table.status, table.createdAt)]);

export const refundRequests = pgTable("refund_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "restrict" }),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  requestedBy: uuid("requested_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("requested"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt,
  updatedAt,
}, (table) => [index("refund_requests_organizer_idx").on(table.organizerId, table.status), index("refund_requests_booking_idx").on(table.bookingId)]);

export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  refundRequestId: uuid("refund_request_id").notNull().references(() => refundRequests.id, { onDelete: "restrict" }),
  paymentTransactionId: uuid("payment_transaction_id").notNull().references(() => paymentTransactions.id, { onDelete: "restrict" }),
  providerReference: text("provider_reference"),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  status: text("status").notNull().default("pending"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt,
}, (table) => [uniqueIndex("refunds_request_uidx").on(table.refundRequestId), index("refunds_status_idx").on(table.status)]);

export const organizerBankAccounts = pgTable("organizer_bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }),
  bankCode: text("bank_code").notNull(),
  accountNumberEncrypted: text("account_number_encrypted").notNull(),
  accountNumberLast4: text("account_number_last4").notNull(),
  accountName: text("account_name").notNull(),
  recipientCode: text("recipient_code"),
  status: text("status").notNull().default("pending"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt,
  updatedAt,
}, (table) => [index("organizer_bank_accounts_idx").on(table.organizerId, table.status)]);

export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "restrict" }),
  bankAccountId: uuid("bank_account_id").notNull().references(() => organizerBankAccounts.id, { onDelete: "restrict" }),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("pending_approval"),
  providerReference: text("provider_reference"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt,
  updatedAt,
}, (table) => [index("payouts_organizer_idx").on(table.organizerId, table.status), uniqueIndex("payouts_provider_ref_uidx").on(table.providerReference)]);

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "restrict" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "restrict" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "restrict" }),
  paymentTransactionId: uuid("payment_transaction_id").references(() => paymentTransactions.id, { onDelete: "restrict" }),
  payoutId: uuid("payout_id").references(() => payouts.id, { onDelete: "restrict" }),
  account: text("account").notNull(),
  direction: text("direction").notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  description: text("description").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt,
}, (table) => [uniqueIndex("ledger_entries_idempotency_uidx").on(table.idempotencyKey), index("ledger_entries_organizer_idx").on(table.organizerId, table.createdAt)]);

export const checkIns = pgTable("check_ins", {
  id: uuid("id").defaultRandom().primaryKey(), bookingAttendeeId: uuid("booking_attendee_id").notNull().references(() => bookingAttendees.id, { onDelete: "cascade" }), entrance: text("entrance").notNull(), staffKey: text("staff_key"), operationId: text("operation_id").notNull().default(""), checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(), reversedAt: timestamp("reversed_at", { withTimezone: true }), reversedBy: text("reversed_by"), reversalReason: text("reversal_reason"),
}, (table) => [uniqueIndex("check_ins_attendee_active_uidx").on(table.bookingAttendeeId).where(sql`${table.reversedAt} is null`), uniqueIndex("check_ins_operation_uidx").on(table.operationId)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(), organizerId: uuid("organizer_id").references(() => organizers.id, { onDelete: "cascade" }), eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }), invitationId: uuid("invitation_id").references(() => invitations.id, { onDelete: "cascade" }), type: text("type").notNull(), title: text("title").notNull(), body: text("body").notNull(), data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(), readAt: timestamp("read_at", { withTimezone: true }), createdAt,
}, (table) => [index("notifications_organizer_idx").on(table.organizerId, table.createdAt)]);

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(), notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }), channel: text("channel").notNull(), recipient: text("recipient").notNull(), subject: text("subject"), content: text("content").notNull(), status: text("status").notNull().default("queued"), providerReference: text("provider_reference"), attemptCount: integer("attempt_count").notNull().default(0), lastError: text("last_error"), createdAt, sentAt: timestamp("sent_at", { withTimezone: true }),
}, (table) => [index("notification_deliveries_outbox_idx").on(table.status, table.createdAt)]);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").references(() => organizers.id, { onDelete: "cascade" }),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("cloudinary"),
  providerId: text("provider_id").notNull(),
  kind: text("kind").notNull().default("image"),
  url: text("url").notNull(),
  alt: text("alt").notNull(),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  status: text("status").notNull().default("ready"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt,
}, (table) => [uniqueIndex("media_assets_provider_uidx").on(table.provider, table.providerId), index("media_assets_organizer_idx").on(table.organizerId, table.createdAt), check("media_assets_one_owner", sql`num_nonnulls(${table.organizerId}, ${table.ownerUserId}) = 1`)]);

export const resourceTerms = pgTable("resource_terms", {
  id: uuid("id").defaultRandom().primaryKey(), kind: text("kind").$type<"category" | "eventType">().notNull(), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(), status: text("status").notNull().default("pending"), proposedBy: uuid("proposed_by").references(() => users.id, { onDelete: "set null" }), mergedIntoId: uuid("merged_into_id"), createdAt, updatedAt,
}, (table) => [uniqueIndex("resource_terms_name_uidx").on(table.kind, table.normalizedName), index("resource_terms_status_idx").on(table.status)]);

export const resourceListings = pgTable("resource_listings", {
  id: uuid("id").defaultRandom().primaryKey(), slug: text("slug").notNull(), ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }), organizerId: uuid("organizer_id").references(() => organizers.id, { onDelete: "cascade" }), createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  content: jsonb("content").$type<ResourceContent>().notNull(), approvedContent: jsonb("approved_content").$type<ResourceContent>(), version: integer("version").notNull().default(1), approvedVersion: integer("approved_version"), publication: text("publication").notNull().default("unpublished"), review: text("review").notNull().default("draft"), reason: text("reason").notNull().default(""), publishedAt: timestamp("published_at", { withTimezone: true }), createdAt, updatedAt,
}, (table) => [uniqueIndex("resource_listings_slug_uidx").on(table.slug), index("resource_listings_public_idx").on(table.publication, table.publishedAt), index("resource_listings_organizer_idx").on(table.organizerId), index("resource_listings_user_idx").on(table.ownerUserId), check("resource_listings_one_owner", sql`num_nonnulls(${table.organizerId}, ${table.ownerUserId}) = 1`)]);

export const resourceRevisions = pgTable("resource_revisions", {
  id: uuid("id").defaultRandom().primaryKey(), listingId: uuid("listing_id").notNull().references(() => resourceListings.id, { onDelete: "cascade" }), version: integer("version").notNull(), content: jsonb("content").$type<ResourceContent>().notNull(), decision: text("decision").notNull().default("pending"), reason: text("reason").notNull().default(""), submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }), reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }), reviewedAt: timestamp("reviewed_at", { withTimezone: true }), createdAt,
}, (table) => [uniqueIndex("resource_revisions_version_uidx").on(table.listingId, table.version)]);

export const resourceListingTerms = pgTable("resource_listing_terms", {
  listingId: uuid("listing_id").notNull().references(() => resourceListings.id, { onDelete: "cascade" }), termId: uuid("term_id").notNull().references(() => resourceTerms.id, { onDelete: "restrict" }),
}, (table) => [primaryKey({ columns: [table.listingId, table.termId] }), index("resource_listing_terms_term_idx").on(table.termId)]);

export const backgroundJobs = pgTable("background_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  status: text("status").notNull().default("queued"),
  idempotencyKey: text("idempotency_key").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  runAfter: timestamp("run_after", { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt,
  updatedAt,
}, (table) => [uniqueIndex("background_jobs_idempotency_uidx").on(table.idempotencyKey), index("background_jobs_queue_idx").on(table.status, table.runAfter)]);

export const platformMembers = pgTable("platform_members", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  createdAt,
  updatedAt,
});

export const supportAccessGrants = pgTable("support_access_grants", {
  id: uuid("id").defaultRandom().primaryKey(),
  platformUserId: uuid("platform_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt,
}, (table) => [index("support_access_active_idx").on(table.platformUserId, table.status, table.expiresAt)]);
