import { changeResource } from "@/lib/resources/server";
import { resourceActionSchema, resourceResponse, uuid } from "@/lib/resources/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return resourceResponse(async () => changeResource(uuid.parse((await params).id), resourceActionSchema.parse(await request.json()))); }
