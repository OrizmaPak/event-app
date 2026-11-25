import { getPlatformPrincipal, getWorkspacePrincipal } from "@/lib/auth/policy";
import { fail, ok } from "@/lib/http/api-response";

export async function GET() {
  const principal = await getWorkspacePrincipal();
  if (!principal) {
    const platform = await getPlatformPrincipal();
    if (!platform) return fail("UNAUTHORIZED", "Sign in to continue.", 401);
    return ok({ user: { id: platform.user.id, email: platform.user.email, name: `${platform.user.firstName} ${platform.user.lastName}`.trim() }, workspace: null, platform: { role: platform.role, mfaEnabled: platform.mfaEnabled }, permissions: [] });
  }
  return ok({ user: { id: principal.userId, email: principal.email, name: principal.name }, workspace: { id: principal.organizerId, role: principal.role, eventScope: principal.eventScope }, permissions: [...principal.permissions] });
}
