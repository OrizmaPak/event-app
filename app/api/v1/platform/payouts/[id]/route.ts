import { eq } from "drizzle-orm";
import { z } from "zod";
import { payouts } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

const schema = z.object({ decision: z.enum(["approve", "reject"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  const principal = await requirePlatformRole("super_admin", "finance_admin");
  if (!principal) return fail("FORBIDDEN", "Finance approval access is required.", 403, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose a payout decision.", 400, null, id);
  const payoutId = (await params).id;
  const status = parsed.data.decision === "approve" ? "approved" : "rejected";
  const [updated] = await getDatabase().update(payouts).set({ status, approvedBy: parsed.data.decision === "approve" ? principal.user.id : null, approvedAt: parsed.data.decision === "approve" ? new Date() : null, updatedAt: new Date() }).where(eq(payouts.id, payoutId)).returning();
  if (!updated) return fail("NOT_FOUND", "Payout was not found.", 404, null, id);
  return ok(updated, 200, id);
}
