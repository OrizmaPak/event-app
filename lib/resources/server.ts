import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { auditLogs, mediaAssets, notificationDeliveries, notifications, organizerMembers, organizers, platformMembers, resourceListings, resourceListingTerms, resourceRevisions, resourceTerms, users } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspacePrincipal, hasPermission, requirePlatformRole } from "@/lib/auth/policy";
import { emptyResource, normalizeTerm, resourceContentSchema, submissionErrors, type ManagedResource, type Publisher, type PublicResource } from "./model";

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Listing = typeof resourceListings.$inferSelect;
export class ResourceError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function resourceUser() {
  const current = await getCurrentUser();
  if (!current) throw new ResourceError("Sign in to manage listings.", 401);
  return current.user;
}
export async function resourceAdmin() {
  const principal = await requirePlatformRole("super_admin");
  if (!principal) throw new ResourceError("Super admin access is required.", 403);
  return principal.user;
}
export async function resourcePublishers(): Promise<Publisher[]> {
  const user = await resourceUser();
  const members = await getDatabase().select({ id: organizers.id, name: organizers.name }).from(organizerMembers).innerJoin(organizers, eq(organizers.id, organizerMembers.organizerId)).where(and(eq(organizerMembers.userId, user.id), eq(organizerMembers.status, "active"), eq(organizers.status, "active")));
  const available: Publisher[] = [{ id: "personal", name: `${user.firstName} ${user.lastName}`, type: "personal", canManage: true }];
  const principals = await Promise.all(members.map(async (member) => ({ member, principal: await getWorkspacePrincipal(member.id) })));
  for (const { member, principal } of principals) {
    if (principal && (hasPermission(principal, "resources.view") || hasPermission(principal, "resources.manage"))) available.push({ ...member, type: "organization", canManage: hasPermission(principal, "resources.manage") });
  }
  return available;
}
export async function authorizePublisher(publisher: string, edit = false) {
  const user = await resourceUser();
  if (publisher === "personal") return { user, organizerId: null, ownerUserId: user.id };
  const principal = await getWorkspacePrincipal(publisher);
  if (!principal || !(hasPermission(principal, "resources.manage") || (!edit && hasPermission(principal, "resources.view")))) throw new ResourceError("You do not have access to these listings.", 403);
  return { user, organizerId: publisher, ownerUserId: null };
}
async function authorizeListing(listing: Listing, edit = false) {
  const owner = await authorizePublisher(listing.organizerId ?? "personal", edit);
  if (listing.ownerUserId && listing.ownerUserId !== owner.user.id) throw new ResourceError("Listing not found.", 404);
  return owner;
}
export async function managedResources(publisher: string): Promise<ManagedResource[]> {
  const access = await authorizePublisher(publisher);
  const publishers = await resourcePublishers();
  const selected = publishers.find((item) => item.id === publisher)!;
  const rows = await getDatabase().select().from(resourceListings).where(access.organizerId ? eq(resourceListings.organizerId, access.organizerId) : eq(resourceListings.ownerUserId, access.user.id)).orderBy(desc(resourceListings.updatedAt));
  return rows.map((row) => ({ ...row, provider: selected.name, canManage: selected.canManage, updatedAt: row.updatedAt.toISOString() }));
}
export async function publicResources(slug?: string): Promise<PublicResource[]> {
  const db = getDatabase();
  const rows = await db.select({ listing: resourceListings, organization: organizers.name, firstName: users.firstName, lastName: users.lastName }).from(resourceListings)
    .leftJoin(organizers, eq(organizers.id, resourceListings.organizerId)).leftJoin(users, eq(users.id, resourceListings.ownerUserId))
    .where(and(eq(resourceListings.publication, "published"), slug ? eq(resourceListings.slug, slug) : undefined, or(and(isNull(resourceListings.organizerId), eq(users.status, "active")), eq(organizers.status, "active"))));
  const terms = await db.select().from(resourceTerms).where(eq(resourceTerms.status, "approved"));
  const termMap = new Map(terms.map((term) => [term.id, term]));
  const associations = rows.length ? await db.select().from(resourceListingTerms).where(inArray(resourceListingTerms.listingId, rows.map(({ listing }) => listing.id))) : [];
  return rows.flatMap(({ listing, organization, firstName, lastName }) => {
    if (!listing.approvedContent || !listing.publishedAt) return [];
    const linked = associations.filter((item) => item.listingId === listing.id).flatMap((item) => termMap.get(item.termId) ?? []);
    const categories = linked.filter((term) => term.kind === "category");
    const eventTypes = linked.filter((term) => term.kind === "eventType");
    return [{ id: listing.id, slug: listing.slug, content: { ...listing.approvedContent, categoryIds: categories.map((term) => term.id), eventTypeIds: eventTypes.map((term) => term.id) }, provider: organization ?? `${firstName} ${lastName}`, categories, eventTypes, publishedAt: listing.publishedAt.toISOString() }];
  });
}
async function validateContent(tx: Transaction, listing: Listing, raw: unknown, actor: string, approvedOnly = false) {
  const parsed = resourceContentSchema.safeParse(raw);
  if (!parsed.success) throw new ResourceError(parsed.error.issues[0]?.message ?? "Check your listing details.");
  const content = parsed.data;
  const allIds = [...new Set([...content.categoryIds, ...content.eventTypeIds])];
  const terms = allIds.length ? await tx.select().from(resourceTerms).where(inArray(resourceTerms.id, allIds)) : [];
  const resolved = async (ids: string[], kind: string) => {
    const result: string[] = [];
    for (const id of new Set(ids)) {
      let term = terms.find((item) => item.id === id);
      if (term?.mergedIntoId) [term] = await tx.select().from(resourceTerms).where(eq(resourceTerms.id, term.mergedIntoId));
      if (!term || term.kind !== kind || (term.status !== "approved" && (approvedOnly || (term.proposedBy !== actor && !listing.content.categoryIds.includes(id) && !listing.content.eventTypeIds.includes(id))))) throw new ResourceError("A selected category or event type needs approval or is unavailable.");
      result.push(term.id);
    }
    return [...new Set(result)];
  };
  content.categoryIds = await resolved(content.categoryIds, "category");
  content.eventTypeIds = await resolved(content.eventTypeIds, "eventType");
  if (new Set(content.images.map((image) => image.assetId)).size !== content.images.length) throw new ResourceError("Use each image once.");
  if (content.images.length) {
    const assets = await tx.select().from(mediaAssets).where(inArray(mediaAssets.id, content.images.map((image) => image.assetId)));
    for (const image of content.images) {
      const asset = assets.find((item) => item.id === image.assetId);
      if (!asset || asset.status !== "ready" || (listing.organizerId ? asset.organizerId !== listing.organizerId : asset.ownerUserId !== listing.ownerUserId) || asset.kind !== "image") throw new ResourceError("One of these images does not belong to this publisher.");
      image.url = asset.url;
    }
  }
  return content;
}
async function audit(tx: Transaction, row: Listing, actor: string, action: string, reason = "") {
  await tx.insert(auditLogs).values({ organizerId: row.organizerId, actorUserId: actor, action: `resource.${action}`, targetType: "resource", targetId: row.id, reason, requestId: crypto.randomUUID() });
}
async function queueNotice(tx: Transaction, row: Listing, action: string) {
  const reviewers = action === "submitted";
  const recipients = reviewers
    ? await tx.select({ id: users.id, email: users.email }).from(platformMembers).innerJoin(users, eq(users.id, platformMembers.userId)).where(and(eq(platformMembers.role, "super_admin"), eq(platformMembers.status, "active"), eq(users.status, "active")))
    : row.organizerId
      ? await tx.select({ id: users.id, email: users.email }).from(organizerMembers).innerJoin(users, eq(users.id, organizerMembers.userId)).where(and(eq(organizerMembers.organizerId, row.organizerId), eq(organizerMembers.status, "active"), eq(organizerMembers.role, "owner"), eq(users.status, "active")))
      : await tx.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, row.ownerUserId!));
  const title = `Resource listing ${action}`;
  const body = `${row.content.title || "Untitled listing"}${row.reason ? `: ${row.reason}` : ""}`;
  for (const recipient of recipients) {
    const [notice] = await tx.insert(notifications).values({ organizerId: reviewers ? null : row.organizerId, type: `resource.${action}`, title, body, data: { recipientUserId: recipient.id, resourceId: row.id, href: reviewers ? "/platform/resources" : row.organizerId ? "/organizer/resources" : "/account/resources" } }).returning();
    await tx.insert(notificationDeliveries).values({ notificationId: notice.id, channel: "email", recipient: recipient.email, subject: title, content: `${title}\n\n${body}\n\nSign in to NASA EVENT to view this listing.` });
  }
}
export async function createResource(publisher: string) {
  const access = await authorizePublisher(publisher, true);
  const id = crypto.randomUUID();
  const [row] = await getDatabase().insert(resourceListings).values({ id, slug: `listing-${id}`, organizerId: access.organizerId, ownerUserId: access.ownerUserId, createdBy: access.user.id, content: emptyResource }).returning();
  return row;
}
export async function changeResource(id: string, input: { action: string; version: number; content?: unknown }) {
  const db = getDatabase();
  const [existing] = await db.select().from(resourceListings).where(eq(resourceListings.id, id));
  if (!existing) throw new ResourceError("Listing not found.", 404);
  const access = await authorizeListing(existing, true);
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(resourceListings).where(eq(resourceListings.id, id)).for("update");
    if (row.version !== input.version) throw new ResourceError("This listing changed in another window. Reload before continuing.", 409);
    if (row.publication === "archived") throw new ResourceError("This listing has been archived.");
    let patch: Partial<Listing> = { updatedAt: new Date(), version: row.version + 1 };
    if (input.action === "save") {
      if (row.review === "pending") throw new ResourceError("Withdraw this submission before editing.");
      patch = { ...patch, content: await validateContent(tx, row, input.content, access.user.id), review: "draft", reason: row.publication === "suspended" ? row.reason : "" };
    } else if (input.action === "submit") {
      if (row.review === "pending") throw new ResourceError("This listing is already awaiting approval.");
      const content = await validateContent(tx, row, row.content, access.user.id);
      const errors = submissionErrors(content); if (errors.length) throw new ResourceError(errors.join(" "));
      patch = { ...patch, content, review: "pending", reason: "" };
      await tx.insert(resourceRevisions).values({ listingId: id, version: patch.version!, content, submittedBy: access.user.id });
    } else if (input.action === "withdraw") {
      if (row.review !== "pending") throw new ResourceError("This listing is not awaiting approval.");
      patch.review = "draft";
      await tx.update(resourceRevisions).set({ decision: "withdrawn" }).where(and(eq(resourceRevisions.listingId, id), eq(resourceRevisions.decision, "pending")));
    } else if (input.action === "unpublish") {
      if (row.publication !== "published") throw new ResourceError("This listing is not published.");
      patch.publication = "unpublished";
    } else if (input.action === "republish") {
      if (row.publication === "suspended" || !row.approvedContent) throw new ResourceError("Admin approval is required before publishing.");
      patch.publication = "published";
    } else if (input.action === "archive") {
      patch = { ...patch, publication: "archived", review: row.review === "pending" ? "draft" : row.review };
      await tx.update(resourceRevisions).set({ decision: "withdrawn" }).where(and(eq(resourceRevisions.listingId, id), eq(resourceRevisions.decision, "pending")));
    } else throw new ResourceError("Choose a valid action.");
    const [updated] = await tx.update(resourceListings).set(patch).where(eq(resourceListings.id, id)).returning();
    await audit(tx, updated, access.user.id, input.action);
    if (input.action === "submit") await queueNotice(tx, updated, "submitted");
    return updated;
  });
}
export async function moderateResource(id: string, input: { action: "approve" | "reject" | "suspend"; version: number; reason?: string }) {
  const admin = await resourceAdmin();
  return getDatabase().transaction(async (tx) => {
    const [row] = await tx.select().from(resourceListings).where(eq(resourceListings.id, id)).for("update");
    if (!row) throw new ResourceError("Listing not found.", 404);
    if (row.version !== input.version) throw new ResourceError("The listing changed. Reload before reviewing.", 409);
    if (row.publication === "archived") throw new ResourceError("Archived listings cannot be reviewed.");
    if (input.action !== "suspend" && row.review !== "pending") throw new ResourceError("This listing is not awaiting approval.");
    if (input.action !== "approve" && !input.reason?.trim()) throw new ResourceError("Give the publisher a reason.");
    let patch: Partial<Listing> = { updatedAt: new Date(), version: row.version + 1, reason: input.reason?.trim() ?? "" };
    if (input.action === "approve") {
      const content = await validateContent(tx, row, row.content, admin.id, true);
      const errors = submissionErrors(content); if (errors.length) throw new ResourceError(errors.join(" "));
      patch = { ...patch, content, approvedContent: content, approvedVersion: row.version, publication: "published", review: "approved", publishedAt: row.publishedAt ?? new Date(), reason: "" };
      await tx.delete(resourceListingTerms).where(eq(resourceListingTerms.listingId, id));
      await tx.insert(resourceListingTerms).values([...new Set([...content.categoryIds, ...content.eventTypeIds])].map((termId) => ({ listingId: id, termId })));
    } else if (input.action === "reject") patch.review = "rejected";
    else patch.publication = "suspended";
    if (input.action !== "suspend") await tx.update(resourceRevisions).set({ decision: input.action === "approve" ? "approved" : "rejected", reason: patch.reason, reviewedBy: admin.id, reviewedAt: new Date() }).where(and(eq(resourceRevisions.listingId, id), eq(resourceRevisions.decision, "pending")));
    const [updated] = await tx.update(resourceListings).set(patch).where(eq(resourceListings.id, id)).returning();
    await audit(tx, updated, admin.id, input.action, patch.reason);
    await queueNotice(tx, updated, input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "suspended");
    return updated;
  });
}
export async function listingTerms() {
  const user = await resourceUser();
  const publishers = await resourcePublishers();
  const orgIds = publishers.filter((item) => item.type === "organization").map((item) => item.id);
  const listings = await getDatabase().select({ content: resourceListings.content }).from(resourceListings).where(or(eq(resourceListings.ownerUserId, user.id), orgIds.length ? inArray(resourceListings.organizerId, orgIds) : undefined));
  const selectedIds = listings.flatMap(({ content }) => [...content.categoryIds, ...content.eventTypeIds]);
  return getDatabase().select().from(resourceTerms).where(or(eq(resourceTerms.status, "approved"), eq(resourceTerms.proposedBy, user.id), selectedIds.length ? inArray(resourceTerms.id, selectedIds) : undefined)).orderBy(resourceTerms.name);
}
export async function proposeTerm(kind: "category" | "eventType", name: string) {
  const user = await resourceUser();
  const normalizedName = normalizeTerm(name);
  const db = getDatabase();
  const [row] = await db.insert(resourceTerms).values({ kind, name: name.trim().replace(/\s+/g, " "), normalizedName, proposedBy: user.id }).onConflictDoNothing().returning();
  if (row) return row;
  const [existing] = await db.select().from(resourceTerms).where(and(eq(resourceTerms.kind, kind), eq(resourceTerms.normalizedName, normalizedName)));
  if (existing.mergedIntoId) { const [target] = await db.select().from(resourceTerms).where(eq(resourceTerms.id, existing.mergedIntoId)); return target; }
  if (existing.status !== "approved" && existing.proposedBy !== user.id) throw new ResourceError("This option is already awaiting review. Choose an existing option for now.");
  return existing;
}
export async function moderateTerm(id: string, input: { action: "approve" | "rename" | "merge"; name?: string; targetId?: string }) {
  const admin = await resourceAdmin();
  return getDatabase().transaction(async (tx) => {
    const [term] = await tx.select().from(resourceTerms).where(eq(resourceTerms.id, id)).for("update");
    if (!term) throw new ResourceError("Option not found.", 404);
    if (term.status === "merged") throw new ResourceError("This option has already been merged.");
    if (input.action === "merge") {
      const [target] = await tx.select().from(resourceTerms).where(eq(resourceTerms.id, input.targetId ?? crypto.randomUUID()));
      if (!target || target.id === id || target.kind !== term.kind || target.status !== "approved") throw new ResourceError("Choose an approved option of the same type.");
      const links = await tx.select().from(resourceListingTerms).where(eq(resourceListingTerms.termId, id));
      if (links.length) await tx.insert(resourceListingTerms).values(links.map((link) => ({ listingId: link.listingId, termId: target.id }))).onConflictDoNothing();
      await tx.delete(resourceListingTerms).where(eq(resourceListingTerms.termId, id));
      await tx.update(resourceTerms).set({ status: "merged", mergedIntoId: target.id, updatedAt: new Date() }).where(eq(resourceTerms.id, id));
    } else {
      const name = input.name?.trim() || term.name;
      const [duplicate] = await tx.select().from(resourceTerms).where(and(eq(resourceTerms.kind, term.kind), eq(resourceTerms.normalizedName, normalizeTerm(name))));
      if (duplicate && duplicate.id !== id) throw new ResourceError("That name already exists. Merge these options instead.");
      await tx.update(resourceTerms).set({ name, normalizedName: normalizeTerm(name), status: input.action === "approve" ? "approved" : term.status, updatedAt: new Date() }).where(eq(resourceTerms.id, id));
    }
    await tx.insert(auditLogs).values({ actorUserId: admin.id, action: `resource.term.${input.action}`, targetType: "resource_term", targetId: id, requestId: crypto.randomUUID(), metadata: input });
  });
}
export async function resourceNotices() {
  const user = await resourceUser();
  return getDatabase().select().from(notifications).where(sql`${notifications.data}->>'recipientUserId' = ${user.id} AND ${notifications.type} LIKE 'resource.%'`).orderBy(desc(notifications.createdAt)).limit(20);
}
