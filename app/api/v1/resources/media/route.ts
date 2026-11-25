import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { mediaAssets } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { authorizePublisher, ResourceError } from "@/lib/resources/server";
import { resourceResponse } from "@/lib/resources/http";

export async function POST(request: Request) {
  return resourceResponse(async () => {
    const input = z.object({ publisher: z.union([z.literal("personal"), z.string().uuid()]), action: z.enum(["sign", "register"]), providerId: z.string().max(300).optional(), alt: z.string().trim().min(2).max(240).optional() }).parse(await request.json());
    const owner = await authorizePublisher(input.publisher, true);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret) throw new ResourceError("Image uploads are not configured.", 503);
    const folder = `nasa-event/resources/${owner.organizerId ?? owner.user.id}`;
    if (input.action === "sign") {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
      return { cloudName, apiKey, folder, timestamp, signature, uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload` };
    }
    if (!input.providerId?.startsWith(`${folder}/`) || !input.alt) throw new ResourceError("The uploaded image does not belong to this publisher.");
    // Read Cloudinary's canonical metadata instead of trusting client-supplied URLs or file sizes.
    const result = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload/${encodeURIComponent(input.providerId)}`, { headers: { authorization: `Basic ${Buffer.from(`${apiKey}:${secret}`).toString("base64")}` }, signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (!result.ok) throw new ResourceError("We could not verify the uploaded image. Please retry.", 502);
    const asset = await result.json() as { public_id: string; secure_url: string; format: string; bytes: number; width: number; height: number; resource_type: string };
    if (asset.public_id !== input.providerId || asset.resource_type !== "image" || !["jpg", "jpeg", "png", "webp", "avif"].includes(asset.format) || asset.bytes > 5 * 1024 * 1024 || !asset.secure_url?.startsWith("https://res.cloudinary.com/")) throw new ResourceError("Use a JPG, PNG, WebP, or AVIF image up to 5 MB.");
    const db = getDatabase();
    const [existing] = await db.select().from(mediaAssets).where(eq(mediaAssets.providerId, asset.public_id));
    if (existing) {
      if (existing.organizerId !== owner.organizerId || existing.ownerUserId !== owner.ownerUserId) throw new ResourceError("Image ownership could not be verified.", 403);
      return existing;
    }
    const [saved] = await db.insert(mediaAssets).values({ organizerId: owner.organizerId, ownerUserId: owner.ownerUserId, providerId: asset.public_id, url: asset.secure_url, alt: input.alt, width: asset.width, height: asset.height, bytes: asset.bytes, createdBy: owner.user.id }).returning();
    return saved;
  });
}
