import { eq } from "drizzle-orm";
import { z } from "zod";
import { authTokens, users } from "@/db/schema";
import { createOpaqueToken, hashToken, normalizeEmail } from "@/lib/auth/tokens";
import { getDatabase } from "@/lib/db/client";
import { ok, requestId } from "@/lib/http/api-response";
import { sendTransactionalEmail } from "@/lib/integrations/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const id = requestId(request);
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json().catch(() => null));
  if (parsed.success) {
    const [user] = await getDatabase().select().from(users).where(eq(users.emailNormalized, normalizeEmail(parsed.data.email))).limit(1);
    if (user?.status === "active") {
      const token = createOpaqueToken();
      await getDatabase().insert(authTokens).values({ userId: user.id, purpose: "reset_password", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
      const origin = new URL(request.url).origin;
      await sendTransactionalEmail({ to: user.email, subject: "Reset your NASA EVENT password", html: `<p>Hello ${user.firstName},</p><p><a href="${origin}/organizer/reset-password?token=${encodeURIComponent(token)}">Choose a new password</a>. This link expires in one hour.</p>` }).catch(() => undefined);
    }
  }
  return ok({ accepted: true }, 202, id);
}
