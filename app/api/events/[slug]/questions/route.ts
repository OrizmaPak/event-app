import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { events, registrationQuestions } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) { const [event] = await getDatabase().select({ id: events.id }).from(events).where(eq(events.slug, (await params).slug)).limit(1); if (!event) return NextResponse.json({ data: null, error: { code: "EVENT_NOT_FOUND", message: "Event not found." } }, { status: 404 }); const questions = await getDatabase().select().from(registrationQuestions).where(eq(registrationQuestions.eventId, event.id)).orderBy(asc(registrationQuestions.sortOrder)); return NextResponse.json({ data: questions, error: null }); }
