import { z } from "zod";
import { listingTerms, proposeTerm } from "@/lib/resources/server";
import { resourceResponse } from "@/lib/resources/http";
export async function GET() { return resourceResponse(listingTerms); }
export async function POST(request: Request) { return resourceResponse(async () => { const value = z.object({ kind: z.enum(["category", "eventType"]), name: z.string().trim().min(2).max(80) }).parse(await request.json()); return proposeTerm(value.kind, value.name); }, 201); }
