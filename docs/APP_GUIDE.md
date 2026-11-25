# NASA EVENT: End-to-End User Guide

Last reviewed: 27 September 2026.

This guide describes the current application, not every feature proposed in earlier plans. Read `VERIFICATION.md` for tested behavior and known gaps. The application is not yet certified for a production launch.

## 1. People and workspaces

| Person | Entry point | Purpose |
| --- | --- | --- |
| Guest | `/`, `/events`, `/organizers` | Discover events and organizer portfolios |
| Invited guest | `/events/[slug]` | Unlock a private event using email and invitation code |
| Organizer | `/organizer/login` | Manage their own workspace, events and team |
| Check-in staff | `/check-in/login` | Verify passes and admit individual attendees |
| Platform administrator | `/platform` | Review refund requests after administrator authentication and MFA |

An organizer membership and a platform-admin membership are separate. A superadmin account does not automatically have an organizer workspace. The current platform interface focuses on financial approvals; it is not a complete organizer/user administration console.

The requested clean starting state is one superadmin, no organizers and no events. The account email is `superadmin@nasaevent.demo`. Use the password provided separately in the conversation; credentials are intentionally omitted from this document.

## 2. Sign-in and account security

1. Open `/organizer/login` and enter your account email and password.
2. Organizers land in `/organizer`; platform members land in `/platform`.
3. Administrators who have not enrolled an authenticator see security setup. Choose **Set up authenticator**, scan the QR or enter the setup key in an authenticator app, and submit its six-digit code.
4. Store the recovery codes securely. Each recovery code works once.
5. Choose **Continue to operations**. On subsequent sign-ins, enter an authenticator code or an unused recovery code when prompted.

Registration at `/organizer/register` creates an organizer account and workspace. Complete email verification before signing in. Development registration can expose a verification-preview link. Actual email delivery requires a configured email provider.

Forgot-password requests use `/organizer/forgot-password`. Reset links expire after one hour, and a successful password reset revokes existing sessions. Without an email provider, do not expect a reset email to arrive.

## 3. Organizer onboarding and portfolio

The organizer workspace provides event management, portfolio editing, team management, settings and finance. The dashboard displays the signed-in organizer's event and attendee counts.

In the portfolio editor, update the organizer name, contact information, location, description and gallery. Save changes, then inspect `/organizers/[slug]`. Image URLs can be used directly. Uploading image files requires Cloudinary configuration. Use meaningful image descriptions and verify that the source URLs are publicly accessible.

## 4. Create an event

Open `/organizer/events/new`. Enter event identity, dates, venue and the required page details. Save a draft or publish when ready. Published events use `/events/[slug]`.

Three independent decisions determine the guest journey:

| Decision | Options | Effect |
| --- | --- | --- |
| Visibility | Public, private-listed, private-unlisted | Controls discovery and invitation requirements |
| Pricing | Free or paid | Determines whether a nonzero booking needs payment |
| Admission | General, organizer-assigned, guest-selected | Determines ticket-category or seat selection |

Private-listed events may appear in discovery, but private content requires an invitation. Private-unlisted events are accessed by direct link. Either kind may be free or paid.

### General admission

Create ticket categories with prices and quantities. Guests choose quantities and supply attendee details; they do not choose seats. Free events have zero-priced tickets.

### Organizer-assigned admission

Guests book ticket categories and provide attendee details. The booking itself does not allocate a specific seat. A complete organizer assignment workflow remains outstanding; do not promise automatic seat allocation.

### Guest-selected admission

Use the graphical seating workspace. New layouts start empty. Add tables, rows, individual seats, stages, aisles or labels; then adjust positions, dimensions and rotation. Table capacity generates individual seats. Price bands are created and edited through a form and applied to objects or individual seats.

The planner includes zoom, expandable workspace dimensions, expanded/fullscreen presentation, duplicate/delete, undo/redo and seat-status controls. Reserved, blocked or unavailable seats should not be offered for purchase.

Creation sends the seating draft to the event API. **Important current limitation:** the existing-event seating screen opens the planner but does not yet save edits back to the inventory. Do not use it to change a live event's booked layout until persistence and booked-seat reconciliation are implemented.

## 5. Design the event page

Use the event-page stage during creation or `/organizer/events/[slug]/page-design` afterward. Choose a wedding, show, business or celebration template and use structured section forms.

Supported section families include hero media, story, schedule, people, highlights, venue, travel, gallery, sponsors, gifts/registry, FAQs, contact and final action. Sections can be added, hidden, duplicated and reordered. Branding controls adjust the shell, colors and typography. Preview the result on desktop and mobile before saving.

The primary action may open native registration or an external URL. Enabled FAQ, travel and registry sections can have secondary pages. Calendar/directions links use the event's configured information. Gift bank details are revealed by an explicit action.

For private events, the server withholds page content until invitation access is verified. Public titles may still appear on the invitation gate and on listed event cards.

## 6. Invite private-event guests

Open the event's guest-management page. Create an invitation with the guest's name and email, optional phone number, permitted party size and personalized fields. The generated invitation code is separate from the organizer's login password.

Share the event link and unique code, or queue an invitation email. The guest enters their email and code on the event page. Successful verification permits that event's pages and booking APIs. Revoked or expired invitations lose access even when an access cookie is still present.

The current invitation endpoint caps party allowance at 50. Booking and hold endpoints also have request limits; unlimited group size from the original prototype brief is not currently implemented.

## 7. Guest registration and payment

1. Open the event and select its registration/ticket action.
2. General/assigned admission: select ticket-category quantities. Guest-selected admission: select available seats.
3. Review the order and provide each attendee's full name and email. Phone numbers are optional.
4. Complete configured registration questions and buyer details.
5. Confirm before the temporary hold expires. Availability and pricing are checked on the server.
6. Zero-total bookings confirm without payment. Paid bookings remain pending until payment succeeds.

The local development environment supports simulated payment decline and success. A declined payment can be retried. Complimentary seats contribute zero even in a paid event. A hold lasts ten minutes; pending-payment bookings have a separate expiry window.

Real payments require Paystack configuration and verified webhook processing. A successful simulated payment is not proof that real charging, settlement or refunds work.

## 8. Group passes

The confirmed booking has one group QR pass and a list of its attendees and seats/ticket tiers. `/guest-pass` reads the pass token from the link supplied after booking. Keep the complete pass link: the token is required to retrieve the booking.

The booking remains shared, but admission is tracked individually. The current notification implementation queues a booking confirmation for the buyer; individual ticket delivery to every companion is not yet a complete workflow.

## 9. Check-in

1. Staff sign in at `/check-in/login` using an account with `checkin.operate` permission.
2. `/check-in/events` lists their published, assigned events. An empty account shows no events.
3. Open an event, scan a QR with the camera or use the backup/manual lookup.
4. Review the whole booking. Select only attendees currently present; no one is automatically selected.
5. Confirm admission. Remaining guests may return with the same QR later.
6. On rescan, already-admitted attendees remain distinguishable. Repeating an admission does not create another active check-in.

Manual lookup searches live booking/attendee records for the current event. Supervision permissions are required for reversal operations. The selected scanner event is checked when verifying a pass.

**Offline limitation:** genuine offline roster caching, offline admission and synchronization are not implemented. The roster route currently uses online lookup. Reconnect before admitting guests; a UI connection indicator is not an offline guarantee.

## 10. Team and permissions

The team screen manages invitations, roles, event scope and member overrides. Built-in roles include owner, manager, event manager, guest manager, finance, check-in supervisor, check-in staff and analyst.

Permissions are action-based: viewing/editing/publishing events; managing page, seating and tickets; viewing/managing/exporting guests; communications; analytics; finance; refunds; check-in; audit. Member overrides add or remove grants. Owners currently receive wildcard access. Event scope limits staff to all workspace events or one event slug.

Changing a role is not the same as assigning platform-admin access. Protect workspace and platform actions independently. Full cross-tenant and per-action authorization auditing remains part of launch readiness.

## 11. Finance, communication and notifications

Organizers can review finance records and request a refund with a reason. Platform finance operations require a suitable platform role and MFA. Approved refund work is queued for a background worker and payment provider.

Invitation and booking notifications are recorded in the database. The delivery worker processes queued messages and retries failures. Provider credentials and scheduled workers are required for actual delivery. In-app notifications are separate from email/SMS delivery.

**Message composer limitation:** the event message composer remains a mock interface. Its prepared/saved indicators do not mean a campaign was persisted, scheduled or sent.

## 12. Event analytics and revenue

Open an event's **Analytics** tab. Capacity, Confirmed, Available and Checked in are selectable filters that update the detail table. Seat inventory shows the seat owner, table/row, seat, price band, ticket price, availability, booking confirmation and check-in status. Confirmed includes every attendee in a confirmed booking, whether checked in or still expected. General and assigned admission show ticket-category capacity instead of inventing individual seat assignments.

Analytics has three focused views: Guests, Revenue and Trends. Guests opens with a visual summary of the selected metric. Capacity shows confirmed, available and set-aside places; attendance shows arrivals and expected guests; availability shows places by price band. Click a breakdown to open its matching records, or use Summary/Details to switch between the chart and table. Search stays visible in Details; the Filters button opens price-band, availability and entry-status filters. Selections persist when switching views. Attendee names link to their individual ticket. Results are paginated in groups of 25; Refresh fetches current database data.

Revenue shows collected income and the financial breakdown. Trends shows one report at a time: activity over time, arrival progress, or price-band performance. The arrival report links to guests still expected, and selecting a price band opens its confirmed guest list. Revenue is available only with finance permission.

Financial details require `finance.view` as well as access to the event. Total ticket value is the value of all configured inventory, not an expense budget. Collected revenue counts each confirmed paid booking once. Checked-in ticket value counts the paid ticket prices of admitted attendees and is already part of collected revenue. Complimentary tickets contribute zero. Processed refunds appear separately; revenue after refunds is before payment/platform fees. Activity charts use the event timezone and ignore reversed check-ins.

The organizer Events page shows confirmed revenue for each event and the portfolio total. Finance includes a revenue-by-event table and separate payment settlement totals. Different currencies are never added together. Simulated paid bookings appear in collected booking revenue but are not provider-processed payments or payable funds. Settlement totals cover all transactions, even though the recent-transactions table displays only the latest 100.

Run `npm run test:analytics` for calculation tests. `npm run test:analytics:integration` requires a local server and creates an isolated temporary workspace, verifies database/HTTP behavior, and removes its fixtures afterward. Optional `ANALYTICS_PLAYWRIGHT_PATH` and `ANALYTICS_BROWSER_CHANNEL` environment variables enable browser interaction and responsive layout checks.

## 13. Resource directory

Open `/resources` to discover approved event services, venues, professionals and equipment. Search and combine service, event-type and location filters. Filters are generated only from approved public listings, and the selected state is preserved in the URL.

Signed-in users manage personal listings at `/account/resources`. Organization members with `resources.manage` use `/organizer/resources`; ownership is fixed when a listing is created. The three-stage editor covers services, details and preview. A listing needs a title, subtitle, description, at least one category, one event type and one explicit contact method before submission. Upload up to five Cloudinary images, reorder them and provide an accessible description for each image.

Drafts are private. Submission places a revision into platform review. Superadmins review listings and proposed categories at `/platform/resources`. Rejection keeps the prior approved version public, while suspension removes a listing immediately. Publishers can withdraw a pending revision, unpublish, republish an approved version or archive a listing. Submission and moderation create in-app notifications and queued email delivery records; actual email delivery still depends on the configured worker and provider.

## 14. Practical test order

1. Confirm admin sign-in and MFA enrollment.
2. Create and verify an organizer account.
3. Create one free general-admission event and complete a two-person booking.
4. Verify the group pass and partial/repeated check-in with an authorized staff account.
5. Repeat with paid general admission, then paid selected seats including a complimentary seat.
6. Create a private invitation; verify access, then revoke it and confirm denial.
7. Review the verification report before attempting real provider operations.

Do not run the demo seed command when preserving an empty database: it adds demo organizers and events.
