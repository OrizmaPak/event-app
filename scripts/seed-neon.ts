import { loadEnvFile } from "node:process";
import { eq } from "drizzle-orm";
import { eventPages, events as eventRows, invitations, notificationDeliveries, notifications, organizers, registrationQuestions } from "../db/schema";
import { getDatabase } from "../lib/db/client";
import { events as mockEvents, organizers as mockOrganizers } from "../lib/data/mock-data";
import { hashInvitationCode, normalizeEmail } from "../lib/security/invitations";

loadEnvFile(".env.local");

const organizerIds = ["11111111-1111-4111-8111-111111111111", "12222222-2222-4222-8222-222222222222", "13333333-3333-4333-8333-333333333333"];
const eventIds = ["21111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "23333333-3333-4333-8333-333333333333", "24444444-4444-4444-8444-444444444444", "25555555-5555-4555-8555-555555555555"];
const db = getDatabase();

for (const [index, organizer] of mockOrganizers.entries()) {
  const profile = { ...organizer } as unknown as Record<string, unknown>;
  await db.insert(organizers).values({ id: organizerIds[index], slug: organizer.slug, name: organizer.name, email: organizer.email, phone: organizer.phone, profile }).onConflictDoUpdate({ target: organizers.slug, set: { name: organizer.name, email: organizer.email, phone: organizer.phone, profile, updatedAt: new Date() } });
}

for (const [index, event] of mockEvents.entries()) {
  const organizerIndex = mockOrganizers.findIndex((organizer) => organizer.id === event.organizerId);
  const visibility = event.slug === "ade-and-zara" ? "private" : "public";
  await db.insert(eventRows).values({
    id: eventIds[index], organizerId: organizerIds[organizerIndex], slug: event.slug, title: event.title, shortTitle: event.shortTitle, eyebrow: event.eyebrow, description: event.description, longDescription: event.longDescription, category: event.category, status: event.status, visibility, privateListing: visibility === "private" ? "listed" : null, pricingMode: event.pricingMode ?? "free", admissionMode: event.admissionMode ?? "general", currency: event.currency ?? "NGN", startAt: new Date(event.dateISO), timezone: "Africa/Lagos", venue: event.venue, address: event.address, city: event.city, capacity: event.capacity, bookingLimit: event.bookingLimit, accent: event.accent, cover: event.cover, publishedAt: event.status === "published" ? new Date() : null,
  }).onConflictDoUpdate({ target: eventRows.slug, set: { title: event.title, visibility, privateListing: visibility === "private" ? "listed" : null, pricingMode: event.pricingMode ?? "free", admissionMode: event.admissionMode ?? "general", updatedAt: new Date() } });
  if (event.eventPage) await db.insert(eventPages).values({ eventId: eventIds[index], config: event.eventPage }).onConflictDoUpdate({ target: eventPages.eventId, set: { config: event.eventPage, updatedAt: new Date() } });
}

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

console.log(`Seeded ${mockEvents.length} events and one private invitation.`);
