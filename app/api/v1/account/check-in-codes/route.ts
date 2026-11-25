import { and, eq, gt, isNotNull } from "drizzle-orm";
import { eventStaffAssignments, events, organizers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/client";
import { decryptSecret } from "@/lib/security/encryption";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const id = requestId(request);
  const current = await getCurrentUser();
  if (!current) return fail("UNAUTHENTICATED", "Sign in to view your event staff codes.", 401, null, id);
  const rows = await getDatabase().select({ encryptedCode: eventStaffAssignments.accessCodeEncrypted, expiresAt: eventStaffAssignments.expiresAt, eventSlug: events.slug, eventTitle: events.title, organizerName: organizers.name })
    .from(eventStaffAssignments)
    .innerJoin(events, eq(events.id, eventStaffAssignments.eventId))
    .innerJoin(organizers, eq(organizers.id, eventStaffAssignments.organizerId))
    .where(and(eq(eventStaffAssignments.userId, current.user.id), eq(eventStaffAssignments.status, "active"), isNotNull(eventStaffAssignments.accessCodeHash), gt(eventStaffAssignments.expiresAt, new Date()), eq(events.status, "published")));
  const codes: Array<{ code: string | null; needsReplacement: boolean; expiresAt: Date; eventSlug: string; eventTitle: string; organizerName: string }> = [];
  for (const row of rows) {
    if (!row.expiresAt) continue;
    const base = { expiresAt: row.expiresAt, eventSlug: row.eventSlug, eventTitle: row.eventTitle, organizerName: row.organizerName };
    if (!row.encryptedCode) { codes.push({ ...base, code: null, needsReplacement: true }); continue; }
    try { codes.push({ ...base, code: decryptSecret(row.encryptedCode), needsReplacement: false }); }
    catch { codes.push({ ...base, code: null, needsReplacement: true }); }
  }
  const response = ok({ codes }, 200, id);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
