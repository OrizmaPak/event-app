import { z } from "zod";
import { moderateTerm } from "@/lib/resources/server";
import { resourceResponse, uuid } from "@/lib/resources/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return resourceResponse(async () => { await moderateTerm(uuid.parse((await params).id), z.object({ action: z.enum(["approve", "rename", "merge"]), name: z.string().trim().min(2).max(80).optional(), targetId: z.string().uuid().optional() }).parse(await request.json())); return { saved: true }; }); }
