# Backend handoff

This document maps the finished mock frontend to the services required for a production application.

## Suggested core entities

| Entity | Important fields | Notes |
| --- | --- | --- |
| User | id, email, password/identity provider, name, status | Organizer identity; passwords must never be stored directly. |
| Workspace | id, name, slug, accent, mode, ownerId | Tenant boundary for organizers and events. |
| Membership | workspaceId, userId, role, status | Owner, manager, check-in supervisor, or staff. |
| OrganizerProfile | workspaceId, bio, city, contact fields, published | Public portfolio fields separated from private account data. |
| Event | id, workspaceId, slug, title, dates, venue, capacity, visibility, status, cover | Slug unique within the public namespace. |
| Guest | id, eventId, name, email, phone, partySize, RSVP state, dietary note | Personally identifiable; restrict exports and logs. |
| Pass | id, guestId, eventId, signedTokenHash, displayCode, status, issuedAt | Store a hash/signature reference, not a trusted plain QR payload. |
| Table / Seat | id, eventId, label, zone, capacity, guestId | Use transactions when moving assignments. |
| Message | id, eventId, audience, channel, subject/body, state, scheduledAt | Delivery jobs and provider IDs live separately. |
| StaffAssignment | id, eventId, membershipId, entrance, expiresAt | The event-day authorization boundary. |
| CheckIn | id, eventId, guestId, passId, staffId, entrance, operationId, createdAt, reversedAt | Unique active check-in per guest/event; keep an audit trail. |
| AuditLog | actorId, workspaceId, eventId, action, metadata, createdAt | Required for permissions, exports, overrides, and reversals. |

## API integration map

Paths are suggestions; GraphQL or server actions can implement the same contracts.

| Frontend flow | Suggested operation | Authorization / behavior |
| --- | --- | --- |
| Event discovery | `GET /api/public/events` | Anonymous; published fields only; filter and paginate server-side. |
| Event page | `GET /api/public/events/:slug` | Anonymous; return 404 for draft/private events without a valid invite. |
| Organizer directory/profile | `GET /api/public/organizers`, `GET /api/public/organizers/:slug` | Anonymous; published profiles only. |
| Guest RSVP | `POST /api/public/events/:slug/rsvps` | Validate invitation/capacity, rate-limit, upsert safely, issue a signed pass. |
| Guest pass | `GET /api/passes/:token` | Use a scoped opaque token; avoid enumerable IDs. |
| Organizer login/logout | `POST /api/auth/login`, `POST /api/auth/logout` | Secure HTTP-only, SameSite cookie; CSRF protection on mutations. |
| Password reset | `POST /api/auth/password-reset` | Uniform response to prevent account enumeration; expiring one-use token. |
| Dashboard overview | `GET /api/workspaces/:id/summary` | Workspace member only; aggregate server-side. |
| Event create/update/publish | `POST/PATCH /api/events`, `POST /api/events/:id/publish` | Owner/manager; validate status transitions and capacity. |
| Guest management/import/export | `/api/events/:id/guests` | Event-scoped permission, strict file validation, audit exports. |
| Seating | `/api/events/:id/tables` and `/assignments` | Owner/manager; transactional assignment updates. |
| Messages | `POST /api/events/:id/messages` | Owner/manager; preview, queue, provider webhook, delivery state. |
| Team and assignments | `/api/workspaces/:id/members`, `/api/events/:id/staff` | Owner controls roles; access expires automatically. |
| Check-in session | `POST /api/check-in/session` | Exchange event code/invite for a short-lived event-scoped session. |
| Pass verification | `POST /api/check-in/events/:id/verify` | Staff assignment required; return valid, duplicate, wrong-event, revoked, or unreadable. |
| Confirm check-in | `POST /api/check-in/events/:id/entries` | Atomic and idempotent; accept `operationId` for offline replay. |
| Reverse check-in | `DELETE /api/check-in/events/:id/entries/:entryId` | Supervisor only; require reason and audit log. |
| Offline roster/sync | `GET /api/check-in/events/:id/roster`, `POST /sync` | Minimal encrypted cache, version/ETag, batched idempotent operations. |

## Response shapes to preserve

The canonical frontend records are in `lib/data/types.ts`. API responses should either use those shapes or map to them inside `lib/services/`; avoid spreading transport-specific fields throughout UI components.

For check-in verification, use a discriminated response so the scanner cannot confuse outcomes:

```ts
type VerifyPassResult =
  | { status: "valid"; guest: Guest; passId: string }
  | { status: "duplicate"; guest: Guest; checkedInAt: string; entrance: string }
  | { status: "invalid"; reason: "wrong_event" | "revoked" | "unreadable" };
```

## Production sequence

1. Implement identity, sessions, workspace membership, and authorization tests.
2. Add the event/guest/seating schema and replace public/dashboard reads.
3. Connect organizer mutations and audit logging.
4. Add RSVP, transactional pass creation, signed QR verification, and email delivery.
5. Add event-scoped staff sessions and atomic online check-in.
6. Add encrypted offline roster storage, operation replay, conflict handling, and supervisor reversal.
7. Add observability, rate limits, backups, privacy retention rules, and full end-to-end tests.

The existing mock UI should remain available behind a development flag so frontend work and demos do not depend on production services.
