import { desc, eq } from "drizzle-orm";
import { organizers, resourceListings, resourceRevisions, resourceTerms, users } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { resourceAdmin, resourceNotices } from "@/lib/resources/server";
import { resourceResponse } from "@/lib/resources/http";
export async function GET() { return resourceResponse(async () => {
  await resourceAdmin();
  const db = getDatabase();
  const rows = await db.select({ listing: resourceListings, organization: organizers.name, firstName: users.firstName, lastName: users.lastName }).from(resourceListings).leftJoin(organizers, eq(organizers.id, resourceListings.organizerId)).leftJoin(users, eq(users.id, resourceListings.ownerUserId)).orderBy(desc(resourceListings.updatedAt));
  return { listings: rows.map(({ listing, organization, firstName, lastName }) => ({ ...listing, provider: organization ?? `${firstName} ${lastName}`, canManage: true })), terms: await db.select().from(resourceTerms).orderBy(resourceTerms.name), revisions: await db.select().from(resourceRevisions).orderBy(desc(resourceRevisions.createdAt)), notices: await resourceNotices() };
}); }
