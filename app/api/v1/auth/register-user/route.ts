import { eq } from "drizzle-orm";
import { z } from "zod";
import { authTokens, passwordCredentials, users } from "@/db/schema";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { createOpaqueToken, hashToken, normalizeEmail } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { sendTransactionalEmail } from "@/lib/integrations/email";

export const runtime = "nodejs";

const schema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().max(200),
  confirmPassword: z.string().max(200),
  acceptedTerms: z.literal(true),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("VALIDATION_ERROR", "Check the highlighted account details.", 400, null, id);
    const passwordError = validatePassword(parsed.data.password);
    if (passwordError) return fail("VALIDATION_ERROR", passwordError, 400, { password: passwordError }, id);
    const emailNormalized = normalizeEmail(parsed.data.email);
    const db = getDatabase();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.emailNormalized, emailNormalized)).limit(1);
    if (existing) return fail("ACCOUNT_EXISTS", "An account already exists for this email address. Try signing in or reset the password.", 409, null, id);

    const passwordHash = await hashPassword(parsed.data.password);
    const verificationToken = createOpaqueToken();
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email: parsed.data.email.trim(), emailNormalized, firstName: parsed.data.firstName, lastName: parsed.data.lastName }).returning();
      await tx.insert(passwordCredentials).values({ userId: user.id, passwordHash });
      await tx.insert(authTokens).values({ userId: user.id, purpose: "verify_email", tokenHash: hashToken(verificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
      return user;
    });
    const origin = new URL(request.url).origin;
    const emailTask = sendTransactionalEmail({ to: result.email, subject: "Verify your NASA EVENT user account", html: `<p>Hello ${result.firstName},</p><p><a href="${origin}/api/v1/auth/verify-email?token=${encodeURIComponent(verificationToken)}">Verify your email address</a>. This link expires in 24 hours.</p><p>After verification, sign in to view the organizations and events assigned to you.</p>` }).catch(() => undefined);
    await Promise.race([emailTask, new Promise<void>((resolve) => setTimeout(resolve, 5000))]);
    return ok({ accountCreated: true, accountType: "user", email: result.email, verificationPreview: process.env.NODE_ENV === "production" ? undefined : `${origin}/api/v1/auth/verify-email?token=${verificationToken}` }, 201, id);
  } catch (error) {
    const databaseError = error as { code?: string };
    if (databaseError.code === "23505") return fail("ACCOUNT_EXISTS", "An account already exists for this email address. Try signing in or reset the password.", 409, null, id);
    console.error("User registration failed", error);
    return fail("REGISTRATION_FAILED", "We could not finish creating the account. Please try again.", 500, null, id);
  }
}
