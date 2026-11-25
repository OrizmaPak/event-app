import { and, asc, inArray, lt, or, eq } from "drizzle-orm";
import { notificationDeliveries } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { sendTransactionalEmail } from "@/lib/integrations/email";
import { sendTransactionalSms } from "@/lib/integrations/sms";

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>"); }

export async function POST(request: Request) {
  const id = requestId(request);
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return fail("UNAUTHORIZED", "Unauthorized.", 401, null, id);
  const db = getDatabase();
  const queued = await db.select().from(notificationDeliveries).where(and(or(eq(notificationDeliveries.status, "queued"), eq(notificationDeliveries.status, "retry")), lt(notificationDeliveries.attemptCount, 5))).orderBy(asc(notificationDeliveries.createdAt)).limit(25);
  const results: Array<{ id: string; status: string }> = [];
  for (const delivery of queued) {
    await db.update(notificationDeliveries).set({ status: "sending", attemptCount: delivery.attemptCount + 1 }).where(and(eq(notificationDeliveries.id, delivery.id), inArray(notificationDeliveries.status, ["queued", "retry"])));
    try {
      const result = delivery.channel === "sms"
        ? await sendTransactionalSms({ to: delivery.recipient, text: delivery.content })
        : await sendTransactionalEmail({ to: delivery.recipient, subject: delivery.subject ?? "NASA EVENT notification", html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${escapeHtml(delivery.content)}</div>` });
      await db.update(notificationDeliveries).set({ status: result.status, providerReference: result.providerReference ?? null, sentAt: result.status === "sent" ? new Date() : null, lastError: null }).where(eq(notificationDeliveries.id, delivery.id));
      results.push({ id: delivery.id, status: result.status });
    } catch (error) {
      const exhausted = delivery.attemptCount + 1 >= 5;
      await db.update(notificationDeliveries).set({ status: exhausted ? "failed" : "retry", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Delivery failed" }).where(eq(notificationDeliveries.id, delivery.id));
      results.push({ id: delivery.id, status: exhausted ? "failed" : "retry" });
    }
  }
  return ok({ processed: results.length, results }, 200, id);
}

export const GET = POST;
