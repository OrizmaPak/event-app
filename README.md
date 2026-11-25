# NASA EVENT

NASA EVENT is a Next.js event platform prototype with public event pages, organizer workspaces, event-day check-in, role-based access, mock payments, invitation access and Neon/PostgreSQL persistence.

The current local baseline is intentionally clean: one platform superadmin account, no organizers and no events. Seed data is optional and should not be used when testing the fresh onboarding flow.

## Documentation

- [End-to-end user guide](docs/APP_GUIDE.md)
- [Technical operations guide](docs/TECHNICAL_OPERATIONS.md)
- [Verification report](docs/VERIFICATION.md)

## Run Locally

Use Node.js `>=22.13.0`.

```sh
npm ci
npm run db:migrate
npm run dev -- --hostname 127.0.0.1 --port 5180
```

Open `http://127.0.0.1:5180`.

## Main Routes

| Area | Route |
| --- | --- |
| Public website | `/`, `/events`, `/organizers`, `/resources` |
| Organizer auth | `/organizer/login`, `/organizer/register` |
| Organizer workspace | `/organizer` |
| Personal resource listings | `/account/resources` |
| Organization resource listings | `/organizer/resources` |
| Check-in app | `/check-in/login`, `/check-in/events` |
| Platform admin | `/platform`, `/platform/resources` |

## Quality Checks

```sh
npm run typecheck
npm run test:unit
npm run test:resources
npm run test:resources:integration
npm run test:smoke
npm run build
```

`npm run test:smoke` creates temporary organizers, events, bookings and check-ins, then removes them. Do not interrupt it during cleanup when using the shared Neon database.

## Important Notes

- Superadmin credentials are not stored in this README. Use the credentials shared separately.
- Provider integrations for real email, SMS, media storage and Paystack payments require environment variables before production use.
- The app is substantially more complete than the original frontend mock, but it is not yet production-certified. Read `docs/VERIFICATION.md` for tested behavior and known gaps.
