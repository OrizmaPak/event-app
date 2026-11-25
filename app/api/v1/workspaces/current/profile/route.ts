import { eq } from "drizzle-orm";
import { z } from "zod";
import { organizers } from "@/db/schema";
import { getWorkspacePrincipal, hasPermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

const galleryItem = z.object({ id: z.string().min(1).max(100), src: z.string().url(), title: z.string().trim().min(1).max(120), caption: z.string().trim().max(240) });
const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email(), phone: z.string().max(30).optional(), profile: z.object({ tagline: z.string().max(180), about: z.string().max(3000), city: z.string().max(120), visible: z.boolean(), gallery: z.array(galleryItem).max(60) }).passthrough() });

export async function GET(request: Request) {
  const id = requestId(request);
  const principal = await getWorkspacePrincipal();
  if (!principal) return fail("UNAUTHORIZED", "Sign in to continue.", 401, null, id);
  const [organizer] = await getDatabase().select().from(organizers).where(eq(organizers.id, principal.organizerId)).limit(1);
  return organizer ? ok(organizer, 200, id) : fail("WORKSPACE_NOT_FOUND", "Workspace not found.", 404, null, id);
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  const principal = await getWorkspacePrincipal();
  if (!principal || !hasPermission(principal, "workspace.manage")) return fail("FORBIDDEN", "You do not have permission to update the public profile.", 403, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Complete the organizer profile and image descriptions.", 400, null, id);
  const [updated] = await getDatabase().update(organizers).set({ name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone || null, profile: parsed.data.profile, updatedAt: new Date() }).where(eq(organizers.id, principal.organizerId)).returning();
  return ok(updated, 200, id);
}
