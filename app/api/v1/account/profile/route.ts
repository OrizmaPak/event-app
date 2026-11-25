import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

const schema = z.object({ firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(80), phone: z.string().trim().max(30).optional() });

export async function GET(request: Request) {
  const id = requestId(request);
  const current = await getCurrentUser();
  return current ? ok({ firstName: current.user.firstName, lastName: current.user.lastName, email: current.user.email, phone: current.user.phone }, 200, id) : fail("UNAUTHORIZED", "Sign in to continue.", 401, null, id);
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  const current = await getCurrentUser();
  if (!current) return fail("UNAUTHORIZED", "Sign in to continue.", 401, null, id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Enter a valid first name, last name and phone number.", 400, null, id);
  const [updated] = await getDatabase().update(users).set({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone || null, updatedAt: new Date() }).where(eq(users.id, current.user.id)).returning({ firstName: users.firstName, lastName: users.lastName, email: users.email, phone: users.phone });
  return ok(updated, 200, id);
}
