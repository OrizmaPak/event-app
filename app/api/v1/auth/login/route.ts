import { and, eq, isNotNull, isNull } from "drizzle-orm";
import * as OTPAuth from "otpauth";
import { z } from "zod";
import { mfaFactors, mfaRecoveryCodes, passwordCredentials, platformMembers, users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { hashToken, normalizeEmail } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { decryptSecret } from "@/lib/security/encryption";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1), mfaCode: z.string().trim().optional() });

export async function POST(request: Request) {
  const id = requestId(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("INVALID_CREDENTIALS", "The email or password is incorrect.", 401, null, id);
  const [record] = await getDatabase().select({ user: users, credential: passwordCredentials }).from(users).innerJoin(passwordCredentials, eq(passwordCredentials.userId, users.id)).where(eq(users.emailNormalized, normalizeEmail(parsed.data.email))).limit(1);
  if (!record || !(await verifyPassword(record.credential.passwordHash, parsed.data.password))) return fail("INVALID_CREDENTIALS", "The email or password is incorrect.", 401, null, id);
  if (record.user.status === "pending_verification") return fail("EMAIL_NOT_VERIFIED", "Verify your email address before signing in.", 403, null, id);
  if (record.user.status !== "active") return fail("ACCOUNT_UNAVAILABLE", "This account is not available. Contact support.", 403, null, id);
  const mfaRequired = process.env.PLATFORM_MFA_REQUIRED !== "false";
  const [factor] = await getDatabase().select({ id: mfaFactors.id, secretEncrypted: mfaFactors.secretEncrypted }).from(mfaFactors).where(and(eq(mfaFactors.userId, record.user.id), isNotNull(mfaFactors.verifiedAt), isNull(mfaFactors.disabledAt))).limit(1);
  if (mfaRequired && factor && !parsed.data.mfaCode) return fail("MFA_REQUIRED", "Enter the code from your authenticator app.", 401, null, id);
  if (mfaRequired && factor) {
    const totp = new OTPAuth.TOTP({ issuer: "NASA EVENT", label: record.user.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(decryptSecret(factor.secretEncrypted)) });
    if (totp.validate({ token: parsed.data.mfaCode!, window: 1 }) === null) {
      const recoveryHash = hashToken(parsed.data.mfaCode!.trim().toUpperCase());
      const [recovery] = await getDatabase().update(mfaRecoveryCodes).set({ usedAt: new Date() }).where(and(eq(mfaRecoveryCodes.userId, record.user.id), eq(mfaRecoveryCodes.codeHash, recoveryHash), isNull(mfaRecoveryCodes.usedAt))).returning({ id: mfaRecoveryCodes.id });
      if (!recovery) return fail("INVALID_MFA_CODE", "That authentication or recovery code is not valid.", 401, null, id);
    }
  }
  const token = await createSession(record.user.id);
  await setSessionCookie(token);
  await getDatabase().update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, record.user.id));
  const [platform] = await getDatabase().select({ userId: platformMembers.userId }).from(platformMembers).where(and(eq(platformMembers.userId, record.user.id), eq(platformMembers.status, "active"))).limit(1);
  return ok({ user: { id: record.user.id, email: record.user.email, firstName: record.user.firstName, lastName: record.user.lastName }, platformMember: Boolean(platform) }, 200, id);
}
