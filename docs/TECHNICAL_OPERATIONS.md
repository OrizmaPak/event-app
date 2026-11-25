# NASA EVENT: Technical Operations

Last reviewed: 27 September 2026. Pair this document with `APP_GUIDE.md` and `VERIFICATION.md`.

## Architecture

The active local application uses Next.js App Router, React, TypeScript, PostgreSQL on Neon and Drizzle ORM. Server route handlers provide JSON APIs. Client components manage forms, previews, seating interaction and scanner state. Historical Vinext/Cloudflare artifacts remain in the repository; current package scripts and Vercel configuration target Next.js. Do not assume the two deployment artifacts are interchangeable.

`db/schema.ts` defines records; `drizzle/` contains migrations. `lib/auth/` implements passwords, session cookies and permissions. `lib/security/` provides invitation signatures and secret encryption. `lib/db/` maps database records into the presentation model. `lib/integrations/` contains provider adapters.

With `DATABASE_URL` set, public event/organizer queries use the database. They no longer silently substitute demo records after a database failure. Without it, some presentation adapters still support prototype data; most operational APIs require a database.

## Local setup

Use the Node version required by `package.json` and the checked-in npm lockfile. Create local environment values from `.env.example`, keeping secrets out of source control.

```sh
npm ci
npm run db:migrate
npm run dev -- --hostname 127.0.0.1 --port 5180
```

The local URL is `http://127.0.0.1:5180`. Do not start a second server on the same port. If a development build has stale generated route types after route deletion, stop that project's dev process, move its `.next/dev` cache to a temporary backup, and restart. Avoid simultaneous route changes and production builds.

`npm run db:seed` adds demo data. It is optional and is incompatible with the requested one-admin/no-event baseline. Migrations do not replace a backup or authorize deleting existing records.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection |
| `NEXT_PUBLIC_APP_URL` | Canonical application URL used in links |
| `INVITATION_SECRET` | Invitation signatures and hashing; currently also encryption fallback |
| `APP_ENCRYPTION_KEY` | Encryption key for stored MFA/QR secrets; configure explicitly for deployment |
| `CRON_SECRET` | Bearer authorization for internal workers |
| `PAYSTACK_SECRET_KEY` | Payment initialization, signature validation and refund operations |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Payment-provider public configuration |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email delivery |
| `TERMII_API_KEY`, `TERMII_SENDER_ID` | SMS delivery |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Media upload signing |

`AUTH_SECRET` is present in the example configuration but is not the current database-session mechanism. Never put private keys in `NEXT_PUBLIC_*` variables. Encryption-key changes require a migration/recovery strategy for already-encrypted records.

## API map

| Area | Routes | Responsibility |
| --- | --- | --- |
| Accounts | `/api/v1/auth/register`, `/verify-email`, `/login`, `/logout`, `/session`, `/forgot-password`, `/reset-password` | Identity and database sessions |
| MFA | `/api/v1/auth/mfa/setup` | Read status, begin setup, verify code |
| Workspace | `/api/v1/workspaces/current/profile`, `/team`, `/roles` | Organizer profile and authorization management |
| Team acceptance | `/api/v1/workspaces/invitations/accept` | Accept an invitation |
| Event creation | `/api/v1/workspaces/current/events` | List scoped events; create event, inventory, questions and page |
| Page design | `/api/v1/workspaces/current/events/[slug]/page` | Save page configuration |
| Private invitations | `/api/organizer/events/[slug]/invitations`, `/api/organizer/invitations/[id]` | Guest invitations and code lifecycle |
| Private access | `/api/events/[slug]/access` | Verify invitation and set/revoke access cookie |
| Registration | `/api/events/[slug]/questions` | Event question definitions |
| Inventory | `/api/v1/public/events/[slug]/inventory`, `/holds`, `/bookings` | Availability, reservations and booking creation |
| Booking retrieval | `/api/v1/public/bookings/[id]` | Read booking using `x-booking-token` |
| Pass retrieval | `/api/v1/public/passes` | Resolve a confirmed pass token |
| Payments | `/api/v1/payments/initialize`, `/simulate`, `/webhooks/paystack` | Payment initialization, development simulation, provider confirmation |
| Check-in | `/api/v1/check-in/verify`, `/lookup`, `/entries`, `/entries/[id]` | Verify, find, admit and reverse attendees |
| Finance | `/api/v1/workspaces/current/finance`, `/refunds`, `/api/v1/platform/refunds` | Finance and approval workflow |
| Resources | `/api/v1/resources`, `/api/v1/account/resources`, `/api/v1/workspaces/current/resources`, `/api/v1/platform/resources` | Public discovery, publisher management and moderation |
| Media | `/api/v1/media/sign`, `/api/v1/media` | Signed upload and media records |
| Workers | `/api/v1/internal/maintenance`, `/deliveries`, `/jobs` | Expiry, notifications and refund jobs |

Most versioned endpoints return `{ data, error, fieldErrors, requestId }`. Several older invitation endpoints use a smaller envelope. Clients must handle non-2xx responses and network failures without treating them as success.

## Data relationships

Users have password credentials, sessions, MFA factors and recovery codes. Organizer memberships connect users to organizers, roles, event scopes and overrides. Platform memberships are independent.

An organizer owns events. Each event owns its page configuration, registration questions, ticket categories, price bands, layout objects, seats and invitations. Layout presentation and inventory identities are separate.

A booking belongs to an event and optionally an invitation. It owns multiple booking attendees. Attendees reference either ticket categories or seats. Prices are integer minor units. The server computes totals from inventory, not UI totals.

Resource listings are owned by exactly one personal user or organization. Mutable draft content is stored separately from the last approved public content. Revisions preserve moderation decisions, approved term associations drive public facets, and media ownership is verified server-side. Editing a published listing does not replace its public version until the new revision is approved.

One group booking has shared payment and QR identity. Check-ins reference individual booking attendees. Database constraints prevent duplicate active admission. Payment transactions, ledger entries, refund requests and background jobs support financial operations; a mock payment does not exercise the entire provider ledger lifecycle.

## Authentication and boundaries

Passwords use scrypt hashes. Session tokens are opaque; their hashes are stored in PostgreSQL and the browser receives an HTTP-only cookie. Production cookies use Secure. Sessions expire after seven days and can be revoked.

TOTP authentication supports one-use recovery codes. Platform operations require MFA. The platform layout presents enrollment directly instead of redirecting platform-only users into an organizer workspace they do not own.

Private event access uses a signed, event-specific cookie with site-wide path so API routes receive it. The event identity is checked and the invitation is reread to enforce revocation/expiry. Private public-page content is gated server-side before serialization.

`proxy.ts` checks mutation origins and adds security headers. Development permits matching-protocol/port localhost aliases. Its rate limiter is process-local; distributed rate limiting and trusted-proxy configuration remain deployment work.

## Notifications and workers

`vercel.json` configures maintenance/jobs every five minutes and deliveries every two minutes. Verify deployment-plan support before enabling these schedules. Workers accept an exact `Authorization: Bearer <CRON_SECRET>` header. A scheduled route without the secret is denied.

Email/SMS adapters return preview status when provider credentials are absent. Preview is not delivery. Confirm sender-domain setup and test actual receipt in staging before launch. Do not invoke delivery or refund workers against real queued records just to smoke-test the UI.

## Verification commands

```sh
npm run test:unit
npm run test:resources
npm run test:resources:integration
npm run typecheck
npm run lint
npm run build
npm run test:smoke
```

Smoke tests require a running local development server and the local environment's database. They create temporary users, organizers, events, holds, bookings, check-ins and notifications. They use simulated payments and draft invitations; they do not intentionally send emails or charge cards. Cleanup deletes only that run's records, with bookings removed before their events.

To run the account/page/MFA/private-access portion alone in PowerShell:

```powershell
$env:SMOKE_AUTH_ONLY = '1'
npm run test:smoke
Remove-Item Env:SMOKE_AUTH_ONLY
```

Do not point this suite at production. It restricts the HTTP host to localhost, but the configured database must also be a development/test database. An interrupted process can leave fixtures behind; inspect and remove only the identified run's fixture IDs, never truncate the application database.

## Production release requirements

Resolve the outstanding product gaps in `VERIFICATION.md`, then use a separate staging database and provider sandbox accounts. Validate real payment callbacks, duplicate webhooks, pending-payment expiry, financial reconciliation, refunds, email/SMS delivery, media uploads, role isolation and invitation access.

Complete mobile/keyboard/accessibility checks, camera tests on intended devices, concurrency/load tests, dependency review, monitoring, backup restoration and incident procedures. Set production secrets and HTTPS origin consistently. Review all prototype fallbacks and labels. A successful build and simulated booking suite alone do not establish production readiness.
