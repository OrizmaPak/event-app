import { z } from "zod";
import { createResource, listingTerms, managedResources, resourceNotices, resourcePublishers } from "@/lib/resources/server";
import { resourceResponse } from "@/lib/resources/http";
export async function GET(request: Request) {
  return resourceResponse(async () => {
    const publisher = new URL(request.url).searchParams.get("publisher") ?? "personal";
    const [publishers, listings, terms, notices] = await Promise.all([resourcePublishers(), managedResources(publisher), listingTerms(), resourceNotices()]);
    return { publishers, listings, terms, notices };
  });
}
export async function POST(request: Request) { return resourceResponse(async () => { const { publisher } = z.object({ publisher: z.union([z.literal("personal"), z.string().uuid()]) }).parse(await request.json()); return createResource(publisher); }, 201); }
