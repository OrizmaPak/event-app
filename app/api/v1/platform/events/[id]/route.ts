import { eq } from "drizzle-orm";
import { z } from "zod";
import { events } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

const schema = z.object({ decision: z.enum(["approve", "return_to_draft"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  const principal = await requirePlatformRole("super_admin");
  if (!principal) return fail("FORBIDDEN", "Super admin access is required.", 403, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose an event approval decision.", 400, null, id);
  const eventId = (await params).id;
  const nextStatus = parsed.data.decision === "approve" ? "published" : "draft";
  const [updated] = await getDatabase().update(events).set({ status: nextStatus, publishedAt: nextStatus === "published" ? new Date() : null, updatedAt: new Date() }).where(eq(events.id, eventId)).returning();
  if (!updated) return fail("NOT_FOUND", "Event was not found.", 404, null, id);
  await writeAudit({ organizerId: updated.organizerId, eventId: updated.id, actorUserId: principal.user.id, action: parsed.data.decision === "approve" ? "event.approved" : "event.returned_to_draft", targetType: "event", targetId: updated.id, requestId: id });
  return ok(updated, 200, id);
}
