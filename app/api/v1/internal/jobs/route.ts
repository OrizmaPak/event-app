import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { backgroundJobs } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { settleApprovedRefund } from "@/lib/server/refunds";

export async function POST(request: Request) {
  const id = requestId(request);
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return fail("UNAUTHORIZED", "Unauthorized.", 401, null, id);
  const db = getDatabase();
  const jobs = await db.select().from(backgroundJobs).where(and(inArray(backgroundJobs.status, ["queued", "retry"]), lte(backgroundJobs.runAfter, new Date()))).orderBy(asc(backgroundJobs.createdAt)).limit(10);
  const outcomes: Array<{ id: string; status: string }> = [];
  for (const job of jobs) {
    const [locked] = await db.update(backgroundJobs).set({ status: "running", lockedAt: new Date(), attemptCount: job.attemptCount + 1, updatedAt: new Date() }).where(and(eq(backgroundJobs.id, job.id), inArray(backgroundJobs.status, ["queued", "retry"]))).returning();
    if (!locked) continue;
    try {
      if (job.type !== "refund.execute") throw new Error(`Unsupported job type: ${job.type}`);
      const refundRequestId = String(job.payload.refundRequestId ?? "");
      await settleApprovedRefund(refundRequestId);
      await db.update(backgroundJobs).set({ status: "completed", completedAt: new Date(), lastError: null, updatedAt: new Date() }).where(eq(backgroundJobs.id, job.id));
      outcomes.push({ id: job.id, status: "completed" });
    } catch (error) {
      const exhausted = job.attemptCount + 1 >= 5;
      const delayMinutes = Math.min(60, 2 ** (job.attemptCount + 1));
      await db.update(backgroundJobs).set({ status: exhausted ? "failed" : "retry", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Job failed", runAfter: new Date(Date.now() + delayMinutes * 60_000), updatedAt: new Date() }).where(eq(backgroundJobs.id, job.id));
      outcomes.push({ id: job.id, status: exhausted ? "failed" : "retry" });
    }
  }
  return ok({ processed: outcomes.length, outcomes }, 200, id);
}

export const GET = POST;
