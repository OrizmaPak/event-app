import { and, eq, isNotNull, isNull } from "drizzle-orm";
import * as OTPAuth from "otpauth";
import { z } from "zod";
import { mfaFactors, mfaRecoveryCodes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { createOpaqueToken, hashToken } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok } from "@/lib/http/api-response";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";

export const runtime = "nodejs";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return fail("UNAUTHORIZED", "Sign in to continue.", 401);
  const [factor] = await getDatabase().select({ verifiedAt: mfaFactors.verifiedAt }).from(mfaFactors).where(and(eq(mfaFactors.userId, current.user.id), isNotNull(mfaFactors.verifiedAt), isNull(mfaFactors.disabledAt))).limit(1);
  return ok({ enabled: Boolean(factor?.verifiedAt) });
}

export async function POST() {
  const current = await getCurrentUser();
  if (!current) return fail("UNAUTHORIZED", "Sign in to continue.", 401);
  const [existing] = await getDatabase().select({ id: mfaFactors.id }).from(mfaFactors).where(and(eq(mfaFactors.userId, current.user.id), isNotNull(mfaFactors.verifiedAt), isNull(mfaFactors.disabledAt))).limit(1);
  if (existing) return fail("MFA_ALREADY_ENABLED", "An authenticator is already enabled for this account.", 409);
  const secret = new OTPAuth.Secret({ size: 20 });
  const [factor] = await getDatabase().insert(mfaFactors).values({ userId: current.user.id, secretEncrypted: encryptSecret(secret.base32) }).returning({ id: mfaFactors.id });
  const totp = new OTPAuth.TOTP({ issuer: "NASA EVENT", label: current.user.email, algorithm: "SHA1", digits: 6, period: 30, secret });
  return ok({ factorId: factor.id, uri: totp.toString(), manualKey: secret.base32 });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUser();
  if (!current) return fail("UNAUTHORIZED", "Sign in to continue.", 401);
  const parsed = z.object({ factorId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("INVALID_MFA_SETUP", "Enter the six-digit code from your authenticator.", 400);
  const body = parsed.data;
  const [factor] = await getDatabase().select().from(mfaFactors).where(and(eq(mfaFactors.id, body.factorId), eq(mfaFactors.userId, current.user.id), isNull(mfaFactors.verifiedAt), isNull(mfaFactors.disabledAt))).limit(1);
  if (!factor || !body.code) return fail("INVALID_MFA_SETUP", "Start MFA setup again.", 400);
  const totp = new OTPAuth.TOTP({ issuer: "NASA EVENT", label: current.user.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(decryptSecret(factor.secretEncrypted)) });
  if (totp.validate({ token: body.code, window: 1 }) === null) return fail("INVALID_MFA_CODE", "That authentication code is not valid.", 400);
  const recoveryCodes = Array.from({ length: 10 }, () => createOpaqueToken(9).toUpperCase());
  await getDatabase().transaction(async (tx) => {
    await tx.update(mfaFactors).set({ verifiedAt: new Date() }).where(eq(mfaFactors.id, factor.id));
    await tx.insert(mfaRecoveryCodes).values(recoveryCodes.map((code) => ({ userId: current.user.id, codeHash: hashToken(code) })));
  });
  return ok({ enabled: true, recoveryCodes });
}
