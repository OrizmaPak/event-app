import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { authTokens, passwordCredentials, userSessions } from "@/db/schema";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const id = requestId(request);
  const parsed = z.object({ token: z.string().min(20), password: z.string().max(200) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("INVALID_RESET", "This password reset link is invalid or expired.", 400, null, id);
  const passwordError = validatePassword(parsed.data.password);
  if (passwordError) return fail("VALIDATION_ERROR", passwordError, 400, { password: passwordError }, id);
  const db = getDatabase();
  const [record] = await db.select().from(authTokens).where(and(eq(authTokens.tokenHash, hashToken(parsed.data.token)), eq(authTokens.purpose, "reset_password"), isNull(authTokens.consumedAt), gt(authTokens.expiresAt, new Date()))).limit(1);
  if (!record) return fail("INVALID_RESET", "This password reset link is invalid or expired.", 400, null, id);
  const passwordHash = await hashPassword(parsed.data.password);
  await db.transaction(async (tx) => {
    await tx.update(passwordCredentials).set({ passwordHash, hashVersion: 1, changedAt: new Date() }).where(eq(passwordCredentials.userId, record.userId));
    await tx.update(authTokens).set({ consumedAt: new Date() }).where(eq(authTokens.id, record.id));
    await tx.update(userSessions).set({ revokedAt: new Date() }).where(and(eq(userSessions.userId, record.userId), isNull(userSessions.revokedAt)));
  });
  return ok({ passwordReset: true }, 200, id);
}
