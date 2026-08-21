import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { notifications } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { getOrganizerSession } from "@/lib/server/organizer-auth";

export async function GET() { const session = await getOrganizerSession(); if (!session) return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, { status: 401 }); const rows = await getDatabase().select().from(notifications).where(eq(notifications.organizerId, session.organizerId)).orderBy(desc(notifications.createdAt)).limit(30); return NextResponse.json({ data: rows, error: null }); }
