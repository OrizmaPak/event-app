import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../lib/db/client";
import { hashPassword } from "../lib/auth/password";
import { hashToken } from "../lib/auth/tokens";
import * as tables from "../db/schema";
import * as OTPAuth from "otpauth";
import { createEditorPageConfig } from "../lib/data/event-page-data";
import { invitationCookieName } from "../lib/security/invitations";

nextEnv.loadEnvConfig(process.cwd());
const origin = process.env.SMOKE_ORIGIN ?? "http://127.0.0.1:5180";
if (!new Set(["localhost", "127.0.0.1"]).has(new URL(origin).hostname)) throw new Error("Smoke tests require a local server.");
const db = getDatabase();
const userId = randomUUID();
const organizerId = randomUUID();
const email = `smoke-${userId}@example.invalid`;
const password = `Test-${randomUUID()}aA1`;
let checks = 0;
let cookie = "";
function cookiePair(response: Response, name: string) {
  const cookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
  const pair = cookies.flatMap((header) => header.split(/, (?=[^;,]+=)/)).map((header) => header.split(";")[0]).find((value) => value.startsWith(`${name}=`));
  assert.ok(pair, `Expected ${name} cookie in response`);
  return pair;
}
async function request(path: string, expected: number, body?: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(origin + path, { method: body === undefined ? "GET" : "POST", headers: { origin, "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual", signal: AbortSignal.timeout(90_000) });
  const text = await response.text();
  assert.equal(response.status, expected, `${path}: ${text.slice(0, 300)}`);
  checks++;
  return { response, data: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text).data : text };
}
try {
  for (const path of ["/", "/events", "/organizers", "/organizer/login", "/organizer/register", "/check-in/events", "/help", "/contact", "/privacy", "/terms", "/guest-pass"]) await request(path, 200);
  const checkInLogin = await request("/check-in/login", 307);
  assert.equal(new URL(checkInLogin.response.headers.get("location")!, origin).pathname, "/check-in/events");
  checks++;
  for (const path of ["/api/v1/workspaces/current/events", "/api/v1/platform/refunds"]) await request(path, 403);
  await request("/api/v1/auth/session", 401);
  await request("/api/v1/auth/login", 401, { email, password });
  await request("/api/v1/auth/login", 403, { email, password }, { origin: "https://untrusted.example" });
  await db.insert(tables.users).values({ id: userId, email, emailNormalized: email, firstName: "Smoke", lastName: "Test", status: "active", emailVerifiedAt: new Date() });
  await db.insert(tables.passwordCredentials).values({ userId, passwordHash: await hashPassword(password) });
  await db.insert(tables.organizers).values({ id: organizerId, slug: `smoke-${organizerId}`, name: "Temporary smoke fixture", email, status: "active" });
  await db.insert(tables.organizerMembers).values({ organizerId, userId, userKey: userId, email, role: "owner", status: "active", eventScope: "all" });
  const login = await request("/api/v1/auth/login", 200, { email, password });
  cookie = cookiePair(login.response, "nasa_session");
  const sessionToken = cookie.slice("nasa_session=".length);
  const persistedSession = await db.select({ id: tables.userSessions.id }).from(tables.userSessions).where(eq(tables.userSessions.tokenHash, hashToken(sessionToken))).limit(1);
  assert.equal(persistedSession.length, 1, "Login should persist the session matching its cookie");
  assert.equal(login.data.platformMember, false);
  await request("/api/v1/auth/session", 200, undefined, { cookie });
  for (const path of ["/organizer", "/organizer/events", "/organizer/events/new", "/organizer/team", "/organizer/settings", "/organizer/portfolio", "/organizer/finance"]) await request(path, 200, undefined, { cookie });
  if (!process.env.SMOKE_AUTH_ONLY) for (const admissionMode of ["general", "assigned", "selectable"]) {
    for (const pricingMode of ["free", "paid"]) {
      const eventId = randomUUID();
      const slug = `smoke-${eventId}`;
      await db.insert(tables.events).values({ id: eventId, organizerId, createdByUserId: userId, slug, title: "Smoke test event", shortTitle: "Smoke", category: "Community", status: "published", pricingMode, admissionMode, startAt: new Date("2027-01-01T12:00:00Z"), venue: "Test venue", address: "Test address", city: "Lagos", capacity: 3 });
      const price = pricingMode === "paid" ? 250000 : 0;
      let selection: object;
      let attendeeSelection: object[];
      if (admissionMode === "selectable") {
        const [band] = await db.insert(tables.priceBands).values({ eventId, name: "Standard", priceMinor: price, color: "#008877" }).returning();
        const [object] = await db.insert(tables.layoutObjects).values({ eventId, type: "round-table", label: "Table 1", presentation: {} }).returning();
        const seats = await db.insert(tables.seats).values([1, 2].map((n) => ({ eventId, layoutObjectId: object.id, stableKey: `seat-${n}`, label: `Seat ${n}`, shortLabel: `${n}`, priceBandId: band.id, priceOverrideMinor: n === 2 ? 0 : null }))).returning();
        selection = { seatIds: seats.map((seat) => seat.id) };
        attendeeSelection = seats.map((seat) => ({ seatId: seat.id }));
      } else {
        const [category] = await db.insert(tables.ticketCategories).values({ eventId, name: "Standard", priceMinor: price, quantityAvailable: 2 }).returning();
        selection = { tickets: [{ ticketCategoryId: category.id, quantity: 2 }] };
        attendeeSelection = [{ ticketCategoryId: category.id }, { ticketCategoryId: category.id }];
      }
      const inventory = await request(`/api/v1/public/events/${slug}/inventory`, 200);
      if (admissionMode !== "selectable") assert.equal(inventory.data.seats.length, 0);
      const hold = await request(`/api/v1/public/events/${slug}/holds`, 201, selection);
      await request(`/api/v1/public/events/${slug}/holds`, 409, selection);
      const attendees = attendeeSelection.map((item, n) => ({ ...item, name: `Attendee ${n + 1}`, email, answers: {} }));
      const bookingInput = { holdToken: hold.data.holdToken, buyerName: "Smoke Buyer", buyerEmail: email, attendees };
      const key = randomUUID();
      const booking = await request(`/api/v1/public/events/${slug}/bookings`, 201, bookingInput, { "idempotency-key": key });
      assert.equal(booking.data.paymentRequired, pricingMode === "paid");
      await request(`/api/v1/public/events/${slug}/bookings`, 200, bookingInput, { "idempotency-key": key });
      if (pricingMode === "paid") {
        await request("/api/v1/payments/simulate", 402, { ...booking.data, outcome: "declined" });
        await request("/api/v1/payments/simulate", 200, { ...booking.data, outcome: "success" });
      }
      const detail = await request(`/api/v1/public/bookings/${booking.data.bookingId}`, 200, undefined, { "x-booking-token": booking.data.managementToken });
      assert.equal(detail.data.totalMinor, admissionMode === "selectable" ? price : price * 2);
      const pass = await request("/api/v1/public/passes", 200, { qrToken: detail.data.qrToken });
      assert.equal(pass.data.attendees.length, 2);
      const issuedCode = await request(`/api/v1/workspaces/current/events/${slug}/staff-codes`, 201, { userId }, { cookie });
      const staffSession = await request("/api/v1/check-in/staff-access", 200, { code: issuedCode.data.code }, {});
      const eventStaffCookie = cookiePair(staffSession.response, "nasa_checkin_staff");
      const staffEvent = await request(`/api/v1/check-in/staff-access?eventSlug=${slug}`, 200, undefined, { cookie: eventStaffCookie });
      assert.equal(staffEvent.data.eventSlug, slug);
      const roster = await request(`/api/v1/check-in/roster?eventSlug=${slug}`, 200, undefined, { cookie: eventStaffCookie });
      assert.equal(roster.data.guests.length, 2);
      const scan = await request("/api/v1/check-in/verify", 200, { qrToken: detail.data.qrToken }, { cookie: eventStaffCookie });
      const entry = { bookingId: booking.data.bookingId, attendeeIds: [scan.data.attendees[0].id], entrance: "Main", operationId: randomUUID() };
      const first = await request("/api/v1/check-in/entries", 200, entry, { cookie: eventStaffCookie });
      assert.equal(first.data.admitted.length, 1);
      const repeat = await request("/api/v1/check-in/entries", 200, entry, { cookie: eventStaffCookie });
      assert.equal(repeat.data.admitted.length, 0);
      assert.equal(repeat.data.alreadyAdmitted.length, 1);
      const rescan = await request("/api/v1/check-in/verify", 200, { qrToken: detail.data.qrToken }, { cookie: eventStaffCookie });
      assert.equal(rescan.data.attendees.filter((attendee: { checkIn: unknown }) => attendee.checkIn).length, 1);
      await db.update(tables.events).set({ visibility: "private", privateListing: "unlisted" }).where(eq(tables.events.id, eventId));
      await request(`/api/v1/public/events/${slug}/inventory`, 401);
      console.log(`PASS ${pricingMode}/${admissionMode}: holds, totals, booking, payment, pass, partial/repeated check-in, privacy`);
    }
  }
  const created = await request("/api/v1/workspaces/current/events", 201, {
    title: `Smoke created ${userId}`, category: "Community", visibility: "public", pricingMode: "free", admissionMode: "general", startAt: "2027-01-01T12:00:00Z", venue: "Test venue", accent: "#008877", capacity: 2, status: "published",
    page: createEditorPageConfig("celebration", "Smoke event"),
    ticketCategories: [{ name: "General", price: 0, quantityAvailable: 2, color: "#008877" }],
  }, { cookie });
  const [checkInEvent] = await db.select({ id: tables.events.id }).from(tables.events).where(eq(tables.events.slug, created.data.slug)).limit(1);
  await db.update(tables.events).set({ status: "published", publishedAt: new Date() }).where(eq(tables.events.id, checkInEvent.id));
  const staffCode = await request(`/api/v1/workspaces/current/events/${created.data.slug}/staff-codes`, 201, { userId }, { cookie });
  assert.match(staffCode.data.code, /^\d{12}$/);
  const unauthorizedStaffAccess = await request("/api/v1/check-in/staff-access", 401);
  assert.equal(unauthorizedStaffAccess.response.status, 401);
  const enteredStaffCode = await request("/api/v1/check-in/staff-access", 200, { code: staffCode.data.code.match(/.{1,4}/g).join("-") });
  const staffCookie = cookiePair(enteredStaffCode.response, "nasa_checkin_staff");
  const staffAccess = await request("/api/v1/check-in/staff-access", 200, undefined, { cookie: staffCookie });
  assert.equal(staffAccess.data.eventSlug, created.data.slug);
  console.log("PASS staff code issue, 12-digit format, grouped entry, event-scoped staff access");
  await request(`/events/${created.data.slug}`, 200);
  await request(`/events/${created.data.slug}/rsvp`, 200);
  await request(`/organizer/events/${created.data.slug}`, 200, undefined, { cookie });
  await request(`/check-in/${created.data.slug}`, 200, undefined, { cookie });
  await request(`/check-in/${created.data.slug}/manual`, 200, undefined, { cookie });
      await request(`/check-in/${created.data.slug}/roster`, 200, undefined, { cookie });
  const privatePage = createEditorPageConfig("celebration", "PRIVATE_CONTENT_SENTINEL");
  await db.update(tables.eventPages).set({ config: privatePage }).where(eq(tables.eventPages.eventId, created.data.id));
  await db.update(tables.events).set({ visibility: "private", privateListing: "unlisted" }).where(eq(tables.events.id, created.data.id));
  const gated = await request(`/events/${created.data.slug}`, 200);
  assert.equal(gated.data.includes("PRIVATE_CONTENT_SENTINEL"), false, "Private page content must not be serialized before invitation verification");
  const invitation = await request(`/api/organizer/events/${created.data.slug}/invitations`, 201, { guestName: "Invited Guest", email, partyAllowance: 2, sendNow: false }, { cookie });
  const access = await request(`/api/events/${created.data.slug}/access`, 200, { email, code: invitation.data.code });
  assert.match(access.response.headers.get("set-cookie")!, /Path=\/;/);
  const invitationCookie = cookiePair(access.response, invitationCookieName(created.data.id));
  await request(`/api/v1/public/events/${created.data.slug}/inventory`, 200, undefined, { cookie: invitationCookie });
  const unlocked = await request(`/events/${created.data.slug}`, 200, undefined, { cookie: invitationCookie });
  assert.equal(unlocked.data.includes("PRIVATE_CONTENT_SENTINEL"), true);
  await db.update(tables.invitations).set({ revokedAt: new Date() }).where(eq(tables.invitations.id, invitation.data.invitation.id));
  await request(`/api/events/${created.data.slug}/access`, 401, undefined, { cookie: invitationCookie });
  await request(`/api/v1/public/events/${created.data.slug}/inventory`, 401, undefined, { cookie: invitationCookie });
  console.log("PASS private page redaction, invitation cookie, API access, revocation");
  const setup = await request("/api/v1/auth/mfa/setup", 200, {}, { cookie });
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(setup.data.manualKey), algorithm: "SHA1", digits: 6, period: 30 });
  const verify = await fetch(origin + "/api/v1/auth/mfa/setup", { method: "PATCH", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify({ factorId: setup.data.factorId, code: totp.generate() }) });
  assert.equal(verify.status, 200);
  const recovery = (await verify.json() as { data: { recoveryCodes: string[] } }).data.recoveryCodes[0];
  if (process.env.PLATFORM_MFA_REQUIRED !== "false") {
    await request("/api/v1/auth/login", 401, { email, password });
    await request("/api/v1/auth/login", 200, { email, password, mfaCode: totp.generate() });
    await request("/api/v1/auth/login", 200, { email, password, mfaCode: recovery });
    await request("/api/v1/auth/login", 401, { email, password, mfaCode: recovery });
    console.log("PASS MFA enforcement, OTP, and one-use recovery codes");
  } else {
    console.log("PASS MFA enrollment; password-only sign-in is allowed by PLATFORM_MFA_REQUIRED=false");
  }
  console.log("PASS event creation, public/organizer/check-in pages, and MFA setup");
  await request("/api/v1/auth/logout", 200, {}, { cookie });
  await request("/api/v1/auth/session", 401, undefined, { cookie });
  console.log(`PASS ${checks} HTTP assertions plus booking and check-in invariants`);
} finally {
  await db.delete(tables.auditLogs).where(eq(tables.auditLogs.actorUserId, userId));
  await db.delete(tables.bookings).where(inArray(tables.bookings.eventId, db.select({ id: tables.events.id }).from(tables.events).where(eq(tables.events.organizerId, organizerId))));
  await db.delete(tables.organizers).where(eq(tables.organizers.id, organizerId));
  await db.delete(tables.users).where(eq(tables.users.id, userId));
  console.log("Removed temporary smoke-test records.");
}
