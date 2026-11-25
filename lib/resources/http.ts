import { z } from "zod";
import { fail, ok } from "@/lib/http/api-response";
import { ResourceError } from "./server";

export async function resourceResponse(run: () => Promise<unknown>, status = 200) {
  try { return ok(await run(), status); }
  catch (error) {
    if (error instanceof ResourceError) return fail("RESOURCE_ERROR", error.message, error.status);
    if (error instanceof z.ZodError) return fail("VALIDATION_ERROR", error.issues[0]?.message ?? "Check the supplied details.", 400);
    console.error("Resource request failed", error instanceof Error ? error.message : "Unknown error");
    return fail("RESOURCE_UNAVAILABLE", "We could not complete that request. Please try again.", 500);
  }
}
export const resourceActionSchema = z.object({ action: z.enum(["save", "submit", "withdraw", "unpublish", "republish", "archive"]), version: z.number().int().positive(), content: z.unknown().optional() });
export const uuid = z.string().uuid();
