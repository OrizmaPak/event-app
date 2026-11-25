import { publicResources, ResourceError } from "@/lib/resources/server";
import { resourceResponse } from "@/lib/resources/http";
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  return resourceResponse(async () => { const [item] = await publicResources((await params).slug); if (!item) throw new ResourceError("Listing not found.", 404); return item; });
}
