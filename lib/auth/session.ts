import { and, eq, gt, isNull } from "drizzle-orm";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { userSessions, users } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { createOpaqueToken, hashToken } from "./tokens";

export const authSessionCookie = "nasa_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

export async function createSession(userId: string) {
  const token = createOpaqueToken();
  const headerStore = await headers();
  await getDatabase().insert(userSessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: headerStore.get("user-agent")?.slice(0, 500),
    expiresAt: new Date(Date.now() + sessionDurationMs),
  });
  return token;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(authSessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(sessionDurationMs / 1000),
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(authSessionCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export const getCurrentUser = cache(async function getCurrentUser() {
  const token = (await cookies()).get(authSessionCookie)?.value;
  if (!token) return null;
  const [record] = await getDatabase()
    .select({ sessionId: userSessions.id, user: users })
    .from(userSessions)
    .innerJoin(users, eq(users.id, userSessions.userId))
    .where(and(eq(userSessions.tokenHash, hashToken(token)), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, new Date()), eq(users.status, "active")))
    .limit(1);
  return record ?? null;
});

export async function revokeCurrentSession() {
  const token = (await cookies()).get(authSessionCookie)?.value;
  if (token) await getDatabase().update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.tokenHash, hashToken(token)));
  await clearSessionCookie();
}
