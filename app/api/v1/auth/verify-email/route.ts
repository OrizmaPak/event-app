import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authTokens, users } from "@/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/organizer/login?verified=invalid", request.url));
  const db = getDatabase();
  const [record] = await db.select().from(authTokens).where(and(eq(authTokens.tokenHash, hashToken(token)), eq(authTokens.purpose, "verify_email"), isNull(authTokens.consumedAt), gt(authTokens.expiresAt, new Date()))).limit(1);
  if (!record) return NextResponse.redirect(new URL("/organizer/login?verified=invalid", request.url));
  await db.transaction(async (tx) => {
    await tx.update(users).set({ status: "active", emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, record.userId));
    await tx.update(authTokens).set({ consumedAt: new Date() }).where(eq(authTokens.id, record.id));
  });
  return NextResponse.redirect(new URL("/organizer/login?verified=success", request.url));
}
