import { filterResources, parseResourceQuery } from "@/lib/resources/model";
import { publicResources } from "@/lib/resources/server";
import { resourceResponse } from "@/lib/resources/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return resourceResponse(async () => filterResources(await publicResources(), parseResourceQuery(new URL(request.url).searchParams))); }
