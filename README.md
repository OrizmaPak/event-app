# NASA EVENT frontend foundation

This repository is the working frontend for NASA EVENT: a guest experience and event-operations product built as three deliberately separate applications.

All screens use realistic mock data today. The page components consume typed domain records and the shared client boundary in `lib/services/`, so a database/API can replace the mocks without rebuilding the interface.

## The three applications

| Application | Route root | Audience | Purpose |
| --- | --- | --- | --- |
| Public website | `/` | Guests and prospective organizers | Discover events, view organizer profiles, RSVP, receive a digital pass, and find help/legal information. |
| Organizer dashboard | `/organizer` | Organizers and managers | Sign in, create and publish events, manage guests, seating, messages, staff, check-in readiness, analytics, profile, and appearance. |
| Event-day check-in | `/check-in` | Restricted door staff | Choose an assigned event, scan passes, handle duplicates/invalid passes, search guests manually, and work from an offline roster. |

These are independent route trees with distinct navigation, authentication state, layouts, and task flows. They share only the brand system, typed records, and future API boundary.

## Run locally

Prerequisites: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Demo access

The prototype never sends credentials or guest data to a server.

- Organizer dashboard: open `/organizer/login`; the form is pre-filled with `john@nasaevent.demo` / `demo1234`.
- Event-day app: open `/check-in/login`; the staff name and access code `LUM-4826` are pre-filled.
- Guest RSVP: open `/events/lumina-gala`, choose RSVP, and finish the short form to generate a personal pass.

Mock sessions and visual preferences are stored in browser `localStorage`. This is intentional for the frontend phase and must be replaced with secure server sessions before production.

## Route inventory

### Public website

- `/` — landing page and product explanation
- `/events` — discover and filter events
- `/events/[slug]` — event details
- `/events/lumina-gala/rsvp` — guest RSVP flow
- `/guest-pass` — RSVP confirmation and QR pass
- `/organizers` and `/organizers/[slug]` — organizer directory and public portfolio
- `/how-it-works`, `/help`, `/contact`, `/privacy`, `/terms`

### Organizer dashboard

- `/organizer/login`, `/register`, `/forgot-password`, `/onboarding`
- `/organizer` — overview
- `/organizer/events`, `/events/new`, `/events/lumina-gala`
- `/organizer/events/lumina-gala/guests`
- `/organizer/events/lumina-gala/seating`
- `/organizer/events/lumina-gala/messages`
- `/organizer/events/lumina-gala/check-in`
- `/organizer/events/lumina-gala/analytics`
- `/organizer/team`, `/organizer/portfolio`, `/organizer/settings`

### Event-day check-in

- `/check-in/login` — restricted staff access
- `/check-in/events` — assigned event picker
- `/check-in/lumina-gala` — camera and hardware/pass-code scanning
- `/check-in/lumina-gala/manual` — cached guest lookup and manual admission
- `/check-in/lumina-gala/roster` — offline and printable fallback

## Source structure

```text
app/                     Next.js route trees for all three applications
components/public/       Public discovery, RSVP, and pass UI
components/dashboard/    Organizer authentication and workspace UI
components/scanner/      Restricted event-day UI
components/shared/       Brand, theme, and reusable primitives
lib/data/types.ts        Canonical frontend domain types
lib/data/mock-data.ts    Replaceable fixture records
lib/services/            API/client boundary for backend integration
db/                      Reserved Drizzle/D1 backend layer
docs/                    Architecture and backend handoff notes
```

## Backend integration

Start in `lib/services/nasa-client.ts`. It is the only mock boundary used by server-rendered pages. Implement the same interface with `fetch`, a server action layer, or direct server-side database calls, then switch the exported client.

Interactive client components currently keep temporary changes in component state or `localStorage`. The integration map in `docs/BACKEND_HANDOFF.md` lists each mutation, the suggested endpoint, authorization rule, and persistence requirement.

Production work still required:

1. Real organizer and staff authentication with secure, HTTP-only sessions.
2. Database schema, migrations, tenant/event authorization, and audit logging.
3. RSVP/pass issuance, signed QR payloads, email delivery, and pass revocation.
4. Atomic check-in verification, duplicate protection, supervisor reversal, and offline reconciliation.
5. File storage for event artwork and organizer avatars.
6. Rate limiting, validation, monitoring, accessibility testing, and end-to-end tests.

See [docs/FRONTEND_ARCHITECTURE.md](docs/FRONTEND_ARCHITECTURE.md) and [docs/BACKEND_HANDOFF.md](docs/BACKEND_HANDOFF.md) before connecting the backend.
