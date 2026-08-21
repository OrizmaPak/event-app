# NASA EVENT full-stack implementation plan

## Product rules

Visibility, pricing and admission are independent dimensions:

| Visibility | Listing | Access | Pricing | Admission |
| --- | --- | --- | --- | --- |
| Public | Listed | Open | Free or paid | General, assigned or selectable seats |
| Private | Listed | Guest email + unique invitation code | Free or paid | General, assigned or selectable seats |
| Private | Unlisted | Guest email + unique invitation code | Free or paid | General, assigned or selectable seats |

A listed private event may appear in discovery, but its story, schedule and guest-specific information remain behind the invitation gate. An unlisted private event is accessible only from its direct link. Invitation codes are unique per event invitation, stored as hashes, and never used as organizer account passwords.

## Frontend implementation

### Organizer workspace

- Event creation separates visibility, private listing, pricing and admission controls. Changing one dimension never rewrites the others.
- The event-page builder controls templates, sections, branding, access presentation and the native or external primary action.
- Registration questions support buyer, booking and attendee scopes with text, long text, email, phone, number, date, time, single choice, multiple choice, checkbox, consent, file placeholder and rating fields.
- The guest manager supports manual and bulk invitation creation, required name and email, optional phone, party allowance, dynamic invitation fields, send-now or draft status, code regeneration, resend, revoke and copy-link actions.
- Event dashboards expose page readiness, invitation delivery, RSVP, payments, seating and check-in status without mixing group bookings with individual admissions.
- A shared notification pattern provides loading, success, warning and error feedback. Destructive actions require confirmation and API failures retain form input.

### Guest experience

- Public pages open directly. Listed private event cards clearly say `Invitation required`; unlisted private events never appear in discovery.
- Private gates request email and invitation code. Successful verification creates a short-lived, HTTP-only event access session and returns only the guest display details needed by the page.
- Personalized private pages may show invitee name, host note, party allowance, RSVP deadline, table or seat, custom invitation fields and the correct RSVP/ticket action.
- Registration renders questions dynamically from the event definition and validates buyer, booking and per-attendee answers before booking.
- Paid and free flows remain independent of visibility. Paid bookings require a successful payment attempt; free bookings bypass payment.
- Email, in-app and operational notifications share delivery states: draft, queued, sent, delivered, failed and suppressed.

## Backend implementation

### PostgreSQL ownership model

- `organizers` own events and organizer memberships.
- `events` store lifecycle, visibility, private listing, pricing, admission, currency, capacity and timestamps.
- `event_pages` store the validated page configuration as JSONB while searchable event fields remain on `events`.
- `registration_questions` store ordered dynamic form definitions and validation settings.
- `ticket_categories`, `price_bands`, `layout_objects` and `seats` provide admission inventory.
- `invitations` store one code hash per invited email and event, personalization JSON, delivery state, response state and revocation/expiry fields.
- `bookings`, `booking_attendees`, `payment_attempts` and `check_ins` preserve group payment relationships while tracking attendee-level seating and admission.
- `notifications` and `notification_deliveries` provide an outbox for email, SMS and in-app delivery providers.
- Every organizer-owned query is scoped by organizer and event IDs. Guest access is scoped by invitation and event IDs.

### APIs and services

- Event reads return public records, listed-private teasers, or full records only after verified access.
- Invitation creation normalizes email, generates a cryptographically random code, stores only its hash, and queues an email notification containing the direct event URL and one-time-visible code.
- Verification uses constant-time hash comparison, generic failure messages and rate-limit hooks. Successful verification sets an event-scoped signed HTTP-only cookie.
- Dynamic question APIs validate supported types, option counts, scope and required rules on the server.
- Booking totals are recalculated from ticket-category or seat inventory; client totals are never authoritative.
- Check-in writes use an attendee-level uniqueness constraint so repeated scans are idempotent.
- Notification providers implement a common adapter. The prototype uses the database outbox and mock preview; a production email/SMS provider can be added without changing organizer interfaces.

## Utilities and contracts

- IDs are UUIDs; slugs and normalized emails have unique indexes in their ownership scopes.
- Dates are stored as timezone-aware timestamps and formatted with the event timezone.
- Currency amounts are stored as integer minor units.
- Invitation and QR secrets are hashed with SHA-256 plus the server secret; raw values are returned only at creation time.
- API responses use `{ data, error, fieldErrors }` and stable error codes suitable for inline forms and toasts.
- Shared utilities cover email normalization, code generation/hashing, access cookies, event authorization, dynamic-answer validation, calendar URLs, money formatting and notification creation.

## Delivery sequence

1. Complete the microsite renderer and organizer page builder.
2. Add the Neon schema, migrations, seed data and database adapter.
3. Add event, invitation, access and notification endpoints.
4. Connect private-event controls, guest invitation management and the personalized access gate.
5. Connect bookings, payments, seats and check-ins to the same service boundary incrementally while retaining mock fallback data for unfinished screens.
6. Add API, database, route, accessibility and responsive regression tests.
7. Configure hosted secrets, deploy, migrate, seed and verify representative public and private flows.

## Production follow-ups

- Replace mock organizer authentication with the selected production identity provider and enforce organizer membership server-side.
- Connect a transactional email provider, SMS provider and payment provider using webhooks and idempotency keys.
- Add distributed rate limiting, audit logs, invitation export controls, retention rules and encrypted sensitive-field handling.
- Move uploaded images and documents to managed object storage with signed upload URLs and content validation.
