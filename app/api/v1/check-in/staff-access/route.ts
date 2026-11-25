import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { eventStaffCodeCookieName, getEventStaffCodePrincipal } from "@/lib/auth/event-staff-code";
import { events } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

const schema = z.object({
  code: z.string().trim().transform((value) => value.replaceAll("-", "")).pipe(z.string().min(12).max(32).regex(/^[A-Z0-9]+$/i)),
});

export async function GET(request: Request) {
  const id = requestId(request);
  const principal = await getEventStaffCodePrincipal();
  if (!principal) return fail("STAFF_CODE_REQUIRED", "Enter your personal staff access code.", 401, null, id);
  const requestedSlug = new URL(request.url).searchParams.get("eventSlug");
  if (requestedSlug && requestedSlug !== principal.eventSlug) return fail("WRONG_EVENT", "This code is assigned to a different event.", 403, { eventSlug: principal.eventSlug }, id);
  const [event] = await getDatabase().select({ title: events.title }).from(events).where(and(eq(events.slug, principal.eventSlug), eq(events.organizerId, principal.organizerId))).limit(1);
  return ok({ authorized: true, eventSlug: principal.eventSlug, eventTitle: event?.title ?? "Check-in", staffName: principal.name, expiresAt: principal.expiresAt }, 200, id);
}

export async function POST(request: Request) {
  const id = requestId(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("INVALID_STAFF_CODE", "Enter the staff code provided by your event creator.", 400, null, id);
  const principal = await getEventStaffCodePrincipal(parsed.data.code);
  if (!principal) return fail("INVALID_STAFF_CODE", "That code is invalid, disabled, or expired. Contact the event creator for help.", 401, null, id);
  const maxAge = Math.max(1, Math.floor((principal.expiresAt.getTime() - Date.now()) / 1000));
  (await cookies()).set(eventStaffCodeCookieName(), parsed.data.code.toUpperCase(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge });
  return ok({ authorized: true, eventSlug: principal.eventSlug, staffName: principal.name, expiresAt: principal.expiresAt }, 200, id);
}

export async function DELETE() {
  (await cookies()).set(eventStaffCodeCookieName(), "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return ok({ signedOut: true });
}
