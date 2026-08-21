import { NextResponse } from "next/server";
import { organizers } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { createOrganizerSession, organizerSessionCookie } from "@/lib/security/organizer-session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string };
  const [organizer] = await getDatabase().select({ id: organizers.id, email: organizers.email }).from(organizers).limit(1);
  if (!organizer) return NextResponse.json({ data: null, error: { code: "DEMO_NOT_READY", message: "The demo organizer has not been seeded." } }, { status: 503 });
  const token = await createOrganizerSession({ organizerId: organizer.id, email: body.email?.trim().toLowerCase() || organizer.email, role: "owner" });
  const response = NextResponse.json({ data: { organizerId: organizer.id }, error: null });
  response.cookies.set(organizerSessionCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}

export async function DELETE() { const response = NextResponse.json({ data: { signedOut: true }, error: null }); response.cookies.set(organizerSessionCookie, "", { httpOnly: true, path: "/", maxAge: 0 }); return response; }
