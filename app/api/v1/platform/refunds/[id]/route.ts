import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { backgroundJobs, paymentTransactions, refundRequests, refunds } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";
import { settleApprovedRefund } from "@/lib/server/refunds";

const schema = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().trim().min(3).max(500) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  const principal = await requirePlatformRole("super_admin", "finance_admin");
  if (!principal) return fail("FORBIDDEN", "Finance approval access is required.", 403, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose a decision and enter a review note.", 400, null, id);
  const db = getDatabase();
  try {
    const result = await db.transaction(async (tx) => {
      const [record] = await tx.select({ request: refundRequests, paymentId: paymentTransactions.id, paymentProvider: paymentTransactions.provider }).from(refundRequests).innerJoin(paymentTransactions, and(eq(paymentTransactions.bookingId, refundRequests.bookingId), eq(paymentTransactions.status, "paid"))).where(and(eq(refundRequests.id, (await params).id), eq(refundRequests.status, "requested"))).for("update").limit(1);
      if (!record) throw new Error("ALREADY_REVIEWED");
      const status = parsed.data.decision === "approve" ? "approved" : "rejected";
      const [reviewed] = await tx.update(refundRequests).set({ status, reviewedBy: principal.user.id, reviewedAt: new Date(), reviewNote: parsed.data.note, updatedAt: new Date() }).where(eq(refundRequests.id, record.request.id)).returning();
      if (status === "approved") {
        await tx.insert(refunds).values({ refundRequestId: record.request.id, paymentTransactionId: record.paymentId, amountMinor: record.request.amountMinor, status: "pending" }).onConflictDoNothing();
        await tx.insert(backgroundJobs).values({ type: "refund.execute", payload: { refundRequestId: record.request.id }, idempotencyKey: `refund:${record.request.id}` }).onConflictDoNothing();
      }
      return { reviewed, paymentProvider: record.paymentProvider };
    }, { isolationLevel: "serializable" });
    if (result.reviewed.status === "approved" && result.paymentProvider === "mock") await settleApprovedRefund(result.reviewed.id);
    const updated = result.reviewed;
    await writeAudit({ organizerId: updated.organizerId, actorUserId: principal.user.id, action: `refund.${updated.status}`, targetType: "refund_request", targetId: updated.id, reason: parsed.data.note, requestId: id });
    return ok(updated, 200, id);
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_REVIEWED") return fail("ALREADY_REVIEWED", "This refund request has already been reviewed.", 409, null, id);
    throw error;
  }
}
