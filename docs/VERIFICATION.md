# NASA EVENT: Verification Report

Last reviewed: 27 September 2026.

This report captures the end-to-end verification completed after the interrupted test run. It is based on the local app connected to the configured Neon database.

## Current baseline

The database has been returned to the requested clean state:

| Record type | Count |
| --- | ---: |
| Users | 1 |
| Organizers | 0 |
| Events | 0 |

The remaining user is the platform superadmin account: `superadmin@nasaevent.demo`.

## Commands completed

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run test:unit` | Passed: 3 auth redirect tests |
| Browser superadmin login | Passed: `superadmin@nasaevent.demo` reaches the platform MFA enrollment screen without console errors |
| Baseline route sweep | Passed: `/`, `/events`, `/organizers`, `/organizer/login`, `/organizer/register`, `/check-in/login`, `/check-in/events`, `/platform` |
| `npm run test:smoke` | Passed: 123 HTTP assertions plus booking/check-in invariants |
| `SMOKE_AUTH_ONLY=1 npm run test:smoke` | Passed: 45 HTTP assertions focused on auth, pages, MFA and private access |
| `npm run lint` | Passed with 7 warnings for plain `<img>` usage in gallery/microsite components |
| `npm run build` | Passed: production Next.js build compiled, type-checked and generated routes |
| Database cleanup check | Passed: one superadmin, no organizers, no events |

## Behavior verified

The smoke suite creates temporary records, exercises them through the application APIs and pages, then deletes them.

Verified booking combinations:

| Pricing | Admission mode | Covered |
| --- | --- | --- |
| Free | General admission | Yes |
| Paid | General admission | Yes |
| Free | Organizer-assigned seating | Yes |
| Paid | Organizer-assigned seating | Yes |
| Free | Guest-selected seating | Yes |
| Paid | Guest-selected seating | Yes |

Verified flows:

- Organizer registration, login session, workspace access and logout.
- Safe login redirects for superadmin and organizer accounts.
- Origin protection rejects disallowed request origins.
- Event creation through the current workspace API.
- Public event, RSVP, organizer event and check-in pages render for temporary events.
- Inventory, seat/category holds, duplicate-hold rejection and booking confirmation.
- Paid booking decline, retry and simulated success.
- Complimentary tickets/seats contributing zero while paid items still accumulate correctly.
- Group pass lookup and attendee-level check-in.
- Partial admission and repeated scan idempotency.
- Private event page redaction before unlock.
- Invitation cookie path, API access after unlock and revocation after invitation removal.
- MFA setup, valid OTP login, one-use recovery code login and recovery-code reuse rejection.

## Fixes completed during verification

- Removed old hardcoded Lumina-only routes that shadowed dynamic routes.
- Added dynamic event layouts for organizer event pages and check-in pages.
- Fixed login redirection so a superadmin without an organizer workspace lands on an accessible platform page.
- Fixed platform MFA setup so superadmins can enroll without being redirected into organizer-only settings.
- Fixed private event access so locked content is not serialized before unlock.
- Changed private invitation cookies to be usable by the related API routes and revalidated against the database on every access.
- Added smoke coverage for private page redaction, invitation unlock and revocation.
- Fixed dashboard summary data so organizer dashboards no longer show hardcoded demo names and counts.
- Fixed lint warnings for the invitation loader dependency and the unused manual check-in prop.
- Added `test:unit` and `test:smoke` scripts.

## Known gaps

These are not hidden failures; they are remaining implementation work before production launch.

- Existing event seating pages can display the planner, but persistent saving for edits to already-created seating layouts is not complete.
- Organizer-assigned seat allocation is not fully automated.
- Message composition is still a mock workflow; it does not send or schedule real messages.
- `/platform` currently focuses on finance/refund operations, not full tenant/user/event administration.
- The check-in roster is online-first; true offline queueing and reconciliation are not complete.
- Real provider credentials and live integration verification are still required for email, SMS, Paystack and media uploads.
- Required custom-question validation on booking submission needs stricter server-side enforcement.
- Companion attendee emails are collected, but delivery to every companion is not fully implemented.
- Rate limiting is process-local and must be moved to shared infrastructure for scaled deployment.
- Some historical prototype screens still contain static demo charts or mock presentation data.
- Lint still reports seven image optimization warnings where prototype gallery/microsite components use plain `<img>` tags instead of `next/image`.

## Recommended next checks

Before a stakeholder demo, run:

```sh
npm run typecheck
npm run test:unit
$env:SMOKE_AUTH_ONLY="1"; npm run test:smoke
npm run build
```

Before production release, run the full smoke suite against staging, verify provider webhooks with real sandbox credentials, test browser flows manually on mobile and desktop, and run an accessibility pass on public pages, RSVP, seat selection and check-in.
