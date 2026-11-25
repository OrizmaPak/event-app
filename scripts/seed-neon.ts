import { loadEnvFile } from "node:process";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { eventPages, events as eventRows, invitations, layoutObjects, notificationDeliveries, notifications, organizerMembers, organizers, passwordCredentials, platformMembers, priceBands, registrationQuestions, seats, ticketCategories, users } from "../db/schema";
import { getDatabase } from "../lib/db/client";
import { events as mockEvents, organizers as mockOrganizers } from "../lib/data/mock-data";
import { hashPassword } from "../lib/auth/password";
import { provisionRoles } from "../lib/auth/provision";
import { normalizeEmail as normalizeAccountEmail } from "../lib/auth/tokens";
import { createSeats, demoLayoutObjects, demoPriceBands } from "../lib/data/seating-data";
import { hashInvitationCode, normalizeEmail } from "../lib/security/invitations";

loadEnvFile(".env.local");

const organizerIds = ["11111111-1111-4111-8111-111111111111", "12222222-2222-4222-8222-222222222222", "13333333-3333-4333-8333-333333333333"];
const eventIds = ["21111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "23333333-3333-4333-8333-333333333333", "24444444-4444-4444-8444-444444444444", "25555555-5555-4555-8555-555555555555"];
const db = getDatabase();
function uuidFrom(value: string) { const hex = createHash("sha256").update(value).digest("hex").slice(0, 32); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`; }

for (const [index, organizer] of mockOrganizers.entries()) {
  const profile = { ...organizer } as unknown as Record<string, unknown>;
  await db.insert(organizers).values({ id: organizerIds[index], slug: organizer.slug, name: organizer.name, email: organizer.email, phone: organizer.phone, status: "active", profile }).onConflictDoUpdate({ target: organizers.slug, set: { name: organizer.name, email: organizer.email, phone: organizer.phone, status: "active", profile, updatedAt: new Date() } });
}

const demoUserId = "01111111-1111-4111-8111-111111111111";
const demoAccountEmail = "john@nasaevent.demo";
await db.insert(users).values({ id: demoUserId, email: demoAccountEmail, emailNormalized: normalizeAccountEmail(demoAccountEmail), firstName: "John", lastName: "Oreva", status: "active", emailVerifiedAt: new Date() }).onConflictDoUpdate({ target: users.emailNormalized, set: { firstName: "John", lastName: "Oreva", status: "active", emailVerifiedAt: new Date(), updatedAt: new Date() } });
await db.insert(passwordCredentials).values({ userId: demoUserId, passwordHash: await hashPassword("demo1234") }).onConflictDoUpdate({ target: passwordCredentials.userId, set: { passwordHash: await hashPassword("demo1234"), changedAt: new Date() } });
const seededRoles = await db.transaction((tx) => provisionRoles(tx, organizerIds[0]));
await db.insert(organizerMembers).values({ organizerId: organizerIds[0], userKey: demoUserId, userId: demoUserId, email: demoAccountEmail, role: "owner", roleId: seededRoles.owner, status: "active", eventScope: "all", acceptedAt: new Date() }).onConflictDoUpdate({ target: [organizerMembers.organizerId, organizerMembers.userKey], set: { userId: demoUserId, email: demoAccountEmail, role: "owner", roleId: seededRoles.owner, status: "active", eventScope: "all", acceptedAt: new Date() } });
await db.insert(platformMembers).values({ userId: demoUserId, role: "super_admin", status: "active" }).onConflictDoUpdate({ target: platformMembers.userId, set: { role: "super_admin", status: "active", updatedAt: new Date() } });

for (const [index, event] of mockEvents.entries()) {
  const organizerIndex = mockOrganizers.findIndex((organizer) => organizer.id === event.organizerId);
  const visibility = event.slug === "ade-and-zara" ? "private" : "public";
  await db.insert(eventRows).values({
    id: eventIds[index], organizerId: organizerIds[organizerIndex], slug: event.slug, title: event.title, shortTitle: event.shortTitle, eyebrow: event.eyebrow, description: event.description, longDescription: event.longDescription, category: event.category, status: event.status, visibility, privateListing: visibility === "private" ? "listed" : null, pricingMode: event.pricingMode ?? "free", admissionMode: event.admissionMode ?? "general", currency: event.currency ?? "NGN", startAt: new Date(event.dateISO), timezone: "Africa/Lagos", venue: event.venue, address: event.address, city: event.city, capacity: event.capacity, bookingLimit: event.bookingLimit, accent: event.accent, cover: event.cover, publishedAt: event.status === "published" ? new Date() : null,
  }).onConflictDoUpdate({ target: eventRows.slug, set: { title: event.title, visibility, privateListing: visibility === "private" ? "listed" : null, pricingMode: event.pricingMode ?? "free", admissionMode: event.admissionMode ?? "general", updatedAt: new Date() } });
  if (event.eventPage) await db.insert(eventPages).values({ eventId: eventIds[index], config: event.eventPage }).onConflictDoUpdate({ target: eventPages.eventId, set: { config: event.eventPage, updatedAt: new Date() } });
}

const luminaId = eventIds[0];
for (const band of demoPriceBands) await db.insert(priceBands).values({ id: uuidFrom(`band:${band.id}`), eventId: luminaId, name: band.name, priceMinor: band.price * 100, color: band.color }).onConflictDoUpdate({ target: priceBands.id, set: { name: band.name, priceMinor: band.price * 100, color: band.color } });
for (const object of demoLayoutObjects) await db.insert(layoutObjects).values({ id: uuidFrom(`layout:${object.id}`), eventId: luminaId, type: object.type, label: object.label, presentation: { x: object.x, y: object.y, width: object.width, height: object.height, rotation: object.rotation, seatCount: object.seatCount }, sortOrder: demoLayoutObjects.indexOf(object) }).onConflictDoUpdate({ target: layoutObjects.id, set: { label: object.label, presentation: { x: object.x, y: object.y, width: object.width, height: object.height, rotation: object.rotation, seatCount: object.seatCount } } });
for (const seat of createSeats()) await db.insert(seats).values({ id: uuidFrom(`seat:${seat.id}`), eventId: luminaId, layoutObjectId: uuidFrom(`layout:${seat.objectId}`), stableKey: seat.id, label: seat.label, shortLabel: seat.shortLabel, priceBandId: uuidFrom(`band:${seat.priceBandId}`), status: seat.status, reservedFor: seat.reservedFor, blockedReason: seat.blockedReason }).onConflictDoUpdate({ target: [seats.eventId, seats.stableKey], set: { label: seat.label, shortLabel: seat.shortLabel, priceBandId: uuidFrom(`band:${seat.priceBandId}`), status: seat.status, reservedFor: seat.reservedFor, blockedReason: seat.blockedReason } });

const generalCategories = [
  { eventId: eventIds[1], key: "founders-standard", name: "Founder pass", description: "Full-day general admission", priceMinor: 2500000, quantityAvailable: 350, color: "#078b9a" },
  { eventId: eventIds[2], key: "art-standard", name: "Gallery admission", description: "Complimentary show admission", priceMinor: 0, quantityAvailable: 220, color: "#e05270" },
  { eventId: eventIds[3], key: "sunday-table", name: "Sunday table pass", description: "Communal lunch admission", priceMinor: 1500000, quantityAvailable: 80, color: "#d28a28" },
  { eventId: eventIds[4], key: "wedding-guest", name: "Invited guest", description: "Complimentary reserved place", priceMinor: 0, quantityAvailable: 240, color: "#6f7d3c" },
];
for (const category of generalCategories) await db.insert(ticketCategories).values({ id: uuidFrom(`ticket:${category.key}`), eventId: category.eventId, name: category.name, description: category.description, priceMinor: category.priceMinor, quantityAvailable: category.quantityAvailable, color: category.color }).onConflictDoUpdate({ target: ticketCategories.id, set: { name: category.name, description: category.description, priceMinor: category.priceMinor, quantityAvailable: category.quantityAvailable, color: category.color } });

const weddingId = eventIds[4];
await db.delete(registrationQuestions).where(eq(registrationQuestions.eventId, weddingId));
await db.insert(registrationQuestions).values([
  { eventId: weddingId, label: "What name should appear on your place card?", type: "short_text", scope: "each_attendee", required: true, placeholder: "Full name", sortOrder: 1 },
  { eventId: weddingId, label: "Do you have any dietary or accessibility needs?", type: "long_text", scope: "each_attendee", required: false, placeholder: "Tell the hosts what would help", sortOrder: 2 },
  { eventId: weddingId, label: "Which celebration will you attend?", type: "multi_choice", scope: "booking", required: true, options: ["Traditional ceremony", "Wedding and reception", "Both days"], sortOrder: 3 },
]);

const invitationId = "31111111-1111-4111-8111-111111111111";
const notificationId = "41111111-1111-4111-8111-111111111111";
const demoEmail = "amara.private@example.com";
const demoCode = "AZ-AMAR-2026";
await db.insert(invitations).values({ id: invitationId, eventId: weddingId, guestName: "Amara Okafor", email: demoEmail, emailNormalized: normalizeEmail(demoEmail), partyAllowance: 2, codeHash: await hashInvitationCode(weddingId, demoEmail, demoCode), personalization: { salutation: "Dear Amara", hostNote: "We have reserved two places for you.", invitationLabel: "Family friend", rsvpDeadline: "2026-11-01" }, deliveryStatus: "queued" }).onConflictDoUpdate({ target: [invitations.eventId, invitations.emailNormalized], set: { guestName: "Amara Okafor", codeHash: await hashInvitationCode(weddingId, demoEmail, demoCode), personalization: { salutation: "Dear Amara", hostNote: "We have reserved two places for you.", invitationLabel: "Family friend", rsvpDeadline: "2026-11-01" }, deliveryStatus: "queued", revokedAt: null, updatedAt: new Date() } });
await db.insert(notifications).values({ id: notificationId, organizerId: organizerIds[0], eventId: weddingId, invitationId, type: "invitation.created", title: "Invitation prepared", body: "Amara Okafor's private event invitation is ready for delivery.", data: { guestName: "Amara Okafor" } }).onConflictDoNothing();
await db.insert(notificationDeliveries).values({ id: "51111111-1111-4111-8111-111111111111", notificationId, channel: "email", recipient: demoEmail, subject: "Your invitation to Ade & Zara", content: `Your invitation code is ${demoCode}.`, status: "queued" }).onConflictDoNothing();

console.log(`Seeded ${mockEvents.length} events, one private invitation and the development organizer account.`);
process.exit(0);
