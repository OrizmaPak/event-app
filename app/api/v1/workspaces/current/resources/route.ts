import { getWorkspacePrincipal } from "@/lib/auth/policy";
import { createResource, listingTerms, managedResources, resourceNotices, resourcePublishers, ResourceError } from "@/lib/resources/server";
import { resourceResponse } from "@/lib/resources/http";
async function publisher() { const principal = await getWorkspacePrincipal(); if (!principal) throw new ResourceError("Workspace unavailable.", 403); return principal.organizerId; }
export async function GET() {
  return resourceResponse(async () => {
    const organizerId = await publisher();
    const [publishers, listings, terms, notices] = await Promise.all([resourcePublishers(), managedResources(organizerId), listingTerms(), resourceNotices()]);
    return { publisher: organizerId, publishers, listings, terms, notices };
  });
}
export async function POST() { return resourceResponse(async () => createResource(await publisher()), 201); }
