import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { organizerMembers, organizers } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

const schema = z.object({ name: z.string().trim().min(1).max(160).optional(), phone: z.string().trim().max(40).optional(), city: z.string().trim().max(120).optional(), status: z.enum(["active", "blocked", "pending"]).optional(), autoEventApproval: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "Choose an organizer setting.");

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  if (!await requirePlatformRole("super_admin")) return fail("FORBIDDEN", "Super admin access is required.", 403, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Choose a valid organizer status.", 400, null, id);
  const organizerId = (await params).id;
  const db = getDatabase();
  const [updated] = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(organizers).where(eq(organizers.id, organizerId)).limit(1);
    if (!current) return [];
    const { city, ...organizerChanges } = parsed.data;
    const [organizer] = await tx.update(organizers).set({ ...organizerChanges, ...(city !== undefined ? { profile: { ...current.profile, city } } : {}), updatedAt: new Date() }).where(eq(organizers.id, organizerId)).returning();
    if (organizer && parsed.data.status === "blocked") await tx.update(organizerMembers).set({ status: "suspended" }).where(eq(organizerMembers.organizerId, organizerId));
    if (organizer && parsed.data.status === "active") await tx.update(organizerMembers).set({ status: "active" }).where(and(eq(organizerMembers.organizerId, organizerId), eq(organizerMembers.status, "suspended")));
    return [organizer];
  });
  return updated ? ok(updated, 200, id) : fail("ORGANIZER_NOT_FOUND", "Organizer not found.", 404, null, id);
}
