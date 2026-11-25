import { createHash } from "node:crypto";
import { getWorkspacePrincipal, hasPermission } from "@/lib/auth/policy";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function POST(request: Request) {
  const id = requestId(request);
  const principal = await getWorkspacePrincipal();
  if (!principal || (!hasPermission(principal, "workspace.manage") && !hasPermission(principal, "page.manage"))) return fail("FORBIDDEN", "You do not have permission to upload media.", 403, null, id);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !secret) return fail("MEDIA_PROVIDER_UNAVAILABLE", "Media uploads are not configured.", 503, null, id);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `nasa-event/${principal.organizerId}`;
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  return ok({ cloudName, apiKey, timestamp, folder, signature, uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload` }, 200, id);
}
