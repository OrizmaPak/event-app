import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { eventPages, events } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

const schema = z.object({ config: z.object({
  template: z.enum(["wedding", "show", "business", "celebration"]), shell: z.enum(["platform", "microsite"]),
  access: z.object({ mode: z.enum(["public", "private-listed", "private-unlisted"]) }).passthrough(),
  branding: z.object({ accent: z.string(), background: z.string(), surface: z.string(), text: z.string(), typography: z.enum(["editorial", "modern", "bold"]) }).passthrough(),
  primaryAction: z.object({ type: z.enum(["native", "external"]), label: z.string().min(1) }).passthrough(),
  sections: z.array(z.object({ id: z.string().min(1), type: z.string().min(1), title: z.string(), visible: z.boolean() }).passthrough()).min(1).max(100),
  seo: z.object({ title: z.string(), description: z.string() }).passthrough(),
}).passthrough() });

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const id = requestId(request);
  const principal = await requirePermission("page.manage");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to edit event pages.", 403, null, id);
  const { slug } = await context.params;
  if (principal.eventScope !== "all" && principal.eventScope !== slug) return fail("FORBIDDEN", "This event is outside your assigned scope.", 403, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "The page configuration is invalid.", 400, null, id);
  const db = getDatabase();
  const [event] = await db.select({ id: events.id }).from(events).where(and(eq(events.organizerId, principal.organizerId), eq(events.slug, slug))).limit(1);
  if (!event) return fail("EVENT_NOT_FOUND", "Event not found.", 404, null, id);
  const saved = await db.transaction(async (tx) => {
    const [page] = await tx.insert(eventPages).values({ eventId: event.id, config: parsed.data.config as never }).onConflictDoUpdate({ target: eventPages.eventId, set: { config: parsed.data.config as never, version: sql`${eventPages.version} + 1`, updatedAt: new Date() } }).returning();
    const mode = parsed.data.config.access.mode;
    await tx.update(events).set({ visibility: mode === "public" ? "public" : "private", privateListing: mode === "private-listed" ? "listed" : mode === "private-unlisted" ? "unlisted" : null, updatedAt: new Date() }).where(eq(events.id, event.id));
    return page;
  });
  await writeAudit({ organizerId: principal.organizerId, eventId: event.id, actorUserId: principal.userId, action: "event_page.updated", targetType: "event_page", targetId: event.id, requestId: id, metadata: { version: saved.version } });
  return ok({ version: saved.version, updatedAt: saved.updatedAt }, 200, id);
}
