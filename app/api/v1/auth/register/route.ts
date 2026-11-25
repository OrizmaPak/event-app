import { eq } from "drizzle-orm";
import { z } from "zod";
import { authTokens, organizerMembers, organizers, passwordCredentials, users } from "@/db/schema";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { provisionRoles } from "@/lib/auth/provision";
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
  acceptedTerms: z.literal(true),
});

export async function POST(request: Request) {
  const id = requestId(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Check the highlighted account details.", 400, Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])), id);
  const passwordError = validatePassword(parsed.data.password);
  if (passwordError) return fail("VALIDATION_ERROR", passwordError, 400, { password: passwordError }, id);
  const emailNormalized = normalizeEmail(parsed.data.email);
  const db = getDatabase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.emailNormalized, emailNormalized)).limit(1);
  if (existing) return fail("ACCOUNT_EXISTS", "An account already exists for this email address.", 409, null, id);

  const passwordHash = await hashPassword(parsed.data.password);
  const verificationToken = createOpaqueToken();
  const verificationHash = hashToken(verificationToken);
  const slugBase = `${parsed.data.firstName}-${parsed.data.lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "organizer";
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ email: parsed.data.email.trim(), emailNormalized, firstName: parsed.data.firstName, lastName: parsed.data.lastName }).returning();
    await tx.insert(passwordCredentials).values({ userId: user.id, passwordHash });
    const [organizer] = await tx.insert(organizers).values({ slug: `${slugBase}-${user.id.slice(0, 6)}`, name: `${user.firstName} ${user.lastName} Events`, email: user.email }).returning();
    const roleIds = await provisionRoles(tx, organizer.id);
    await tx.insert(organizerMembers).values({ organizerId: organizer.id, userKey: user.id, userId: user.id, email: user.email, role: "owner", roleId: roleIds.owner, status: "active", eventScope: "all", acceptedAt: new Date() });
    await tx.insert(authTokens).values({ userId: user.id, purpose: "verify_email", tokenHash: verificationHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    return { user, organizer };
  });
  const origin = new URL(request.url).origin;
  await sendTransactionalEmail({ to: result.user.email, subject: "Verify your NASA EVENT account", html: `<p>Hello ${result.user.firstName},</p><p><a href="${origin}/api/v1/auth/verify-email?token=${encodeURIComponent(verificationToken)}">Verify your email address</a>. This link expires in 24 hours.</p>` }).catch(() => undefined);
  return ok({ accountCreated: true, email: result.user.email, verificationPreview: process.env.NODE_ENV === "production" ? undefined : `${origin}/api/v1/auth/verify-email?token=${verificationToken}` }, 201, id);
}
