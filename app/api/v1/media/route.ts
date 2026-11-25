import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { events, mediaAssets } from "@/db/schema";
import { getWorkspacePrincipal, hasPermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

const schema = z.object({ providerId: z.string().min(1).max(300), url: z.string().url(), alt: z.string().trim().min(2).max(240), width: z.number().int().positive().optional(), height: z.number().int().positive().optional(), bytes: z.number().int().positive().optional(), eventId: z.string().uuid().optional() });

export async function GET(request: Request) {
  const id = requestId(request);
  const principal = await getWorkspacePrincipal();
  if (!principal) return fail("UNAUTHORIZED", "Sign in to continue.", 401, null, id);
  const rows = await getDatabase().select().from(mediaAssets).where(eq(mediaAssets.organizerId, principal.organizerId)).orderBy(desc(mediaAssets.createdAt)).limit(200);
  return ok(rows, 200, id);
}

export async function POST(request: Request) {
  const id = requestId(request);
  const principal = await getWorkspacePrincipal();
  if (!principal || (!hasPermission(principal, "workspace.manage") && !hasPermission(principal, "page.manage"))) return fail("FORBIDDEN", "You do not have permission to add media.", 403, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Complete the media details and accessible description.", 400, null, id);
  const db = getDatabase();
  if (!parsed.data.providerId.startsWith(`nasa-event/${principal.organizerId}/`)) return fail("FORBIDDEN", "This image does not belong to this workspace.", 403, null, id);
  if (parsed.data.eventId) {
    const [event] = await db.select({ id: events.id }).from(events).where(and(eq(events.id, parsed.data.eventId), eq(events.organizerId, principal.organizerId)));
    if (!event) return fail("FORBIDDEN", "This event does not belong to this workspace.", 403, null, id);
  }
  const [asset] = await db.insert(mediaAssets).values({ organizerId: principal.organizerId, eventId: parsed.data.eventId, providerId: parsed.data.providerId, url: parsed.data.url, alt: parsed.data.alt, width: parsed.data.width, height: parsed.data.height, bytes: parsed.data.bytes, createdBy: principal.userId }).onConflictDoUpdate({ target: [mediaAssets.provider, mediaAssets.providerId], set: { alt: parsed.data.alt }, setWhere: eq(mediaAssets.organizerId, principal.organizerId) }).returning();
  if (!asset) return fail("FORBIDDEN", "This image does not belong to this workspace.", 403, null, id);
  return ok(asset, 201, id);
}
