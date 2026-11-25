import { z } from "zod";
import { moderateResource } from "@/lib/resources/server";
import { resourceResponse, uuid } from "@/lib/resources/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return resourceResponse(async () => moderateResource(uuid.parse((await params).id), z.object({ action: z.enum(["approve", "reject", "suspend"]), version: z.number().int().positive(), reason: z.string().trim().max(1000).optional() }).parse(await request.json()))); }
