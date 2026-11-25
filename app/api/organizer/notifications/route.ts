import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { notifications } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/policy";

export async function GET() { const principal = await requirePermission("workspace.view"); if (!principal) return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, { status: 401 }); const rows = await getDatabase().select().from(notifications).where(eq(notifications.organizerId, principal.organizerId)).orderBy(desc(notifications.createdAt)).limit(30); return NextResponse.json({ data: rows, error: null }); }
