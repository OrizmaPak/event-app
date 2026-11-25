import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { eventPages, events, layoutObjects, organizers, priceBands, registrationQuestions, seats, ticketCategories } from "@/db/schema";
import { requirePermission } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";
import { writeAudit } from "@/lib/server/audit";

const questionSchema = z.object({
  label: z.string().trim().min(1).max(300), type: z.string().min(1).max(40), scope: z.string().min(1).max(40),
  required: z.boolean().default(false), placeholder: z.string().max(300).default(""), helpText: z.string().max(1000).default(""),
  options: z.array(z.string().max(200)).max(100).default([]), min: z.string().max(30).default(""), max: z.string().max(30).default(""),
});
const categorySchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(500).default(""), price: z.number().min(0), quantityAvailable: z.number().int().min(0).max(1_000_000), color: z.string().regex(/^#[0-9a-f]{6}$/i) });
const eventDaySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) });
const scheduleSchema = z.array(eventDaySchema).min(1).max(31).superRefine((days, context) => {
  const dates = new Set<string>();
  days.forEach((day, index) => {
    if (dates.has(day.date)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "date"], message: "Each event day must have a unique date." });
    dates.add(day.date);
    if (day.startTime >= day.endTime) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "endTime"], message: "End time must be after start time." });
  });
});
const pageSchema = z.object({
  template: z.enum(["wedding", "show", "business", "celebration"]), shell: z.enum(["platform", "microsite"]),
  access: z.object({ mode: z.enum(["public", "private-listed", "private-unlisted"]), hint: z.string().optional() }).passthrough(),
  branding: z.object({ accent: z.string(), background: z.string(), surface: z.string(), text: z.string(), typography: z.enum(["editorial", "modern", "bold"]) }).passthrough(),
  primaryAction: z.object({ type: z.enum(["native", "external"]), label: z.string().min(1), url: z.string().optional() }).passthrough(),
  sections: z.array(z.object({ id: z.string().min(1), type: z.string().min(1), title: z.string(), visible: z.boolean() }).passthrough()).min(1).max(100),
  seo: z.object({ title: z.string(), description: z.string(), image: z.string().optional() }).passthrough(),
}).passthrough();
const seatingSchema = z.object({
  objects: z.array(z.object({ id: z.string().min(1).max(120), type: z.string().min(1).max(40), label: z.string().min(1).max(120), x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(), rotation: z.number(), seatCount: z.number().int().min(0).max(200), priceBandId: z.string().optional() })).max(1000),
  bands: z.array(z.object({ id: z.string().min(1).max(120), name: z.string().min(1).max(120), price: z.number().min(0), color: z.string().regex(/^#[0-9a-f]{6}$/i) })).min(1).max(100),
  seatEdits: z.record(z.string(), z.object({ priceBandId: z.string().optional(), status: z.enum(["available", "reserved", "blocked", "unavailable"]).optional(), note: z.string().max(300).optional() })),
  canvas: z.object({ width: z.number().int().min(400).max(5000), height: z.number().int().min(400).max(5000) }),
});
const createSchema = z.object({
  title: z.string().trim().min(3).max(180), category: z.string().trim().min(2).max(80), visibility: z.enum(["public", "private-listed", "private-unlisted"]),
  pricingMode: z.enum(["free", "paid"]), admissionMode: z.enum(["general", "assigned", "selectable"]), currency: z.string().length(3).default("NGN"),
  startAt: z.string().datetime({ offset: true }), endAt: z.string().datetime({ offset: true }).optional(), timezone: z.string().min(1).max(80).default("Africa/Lagos"),
  eventDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(31).optional(),
  schedule: scheduleSchema.optional(),
  venue: z.string().trim().min(2).max(240), address: z.string().max(400).default(""), city: z.string().max(120).default("Lagos"), accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  capacity: z.number().int().min(0).max(1_000_000), status: z.enum(["draft", "published"]).default("draft"), page: pageSchema,
  ticketCategories: z.array(categorySchema).max(100).default([]), questions: z.array(questionSchema).max(100).default([]), seating: seatingSchema.optional().nullable(),
});

function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "event"; }

export async function GET() {
  const principal = await requirePermission("events.view");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to view events.", 403);
  const rows = await getDatabase().select().from(events).where(and(eq(events.organizerId, principal.organizerId), principal.eventScope === "all" ? undefined : eq(events.slug, principal.eventScope))).orderBy(asc(events.startAt));
  return ok(rows);
}

export async function POST(request: Request) {
  const id = requestId(request);
  const principal = await requirePermission("events.create");
  if (!principal) return fail("FORBIDDEN", "You do not have permission to create events.", 403, null, id);
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Complete the required event, admission, and page details.", 400, Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])), id);
  const db = getDatabase();
  const pageConfig = { ...parsed.data.page, access: { ...parsed.data.page.access, mode: parsed.data.visibility }, ...(parsed.data.eventDates ? { eventDates: parsed.data.eventDates } : {}), ...(parsed.data.schedule ? { schedule: parsed.data.schedule } : {}) };
  const base = slugify(parsed.data.title);
  let slug = base;
  for (let suffix = 2; await db.select({ id: events.id }).from(events).where(eq(events.slug, slug)).limit(1).then((rows) => rows.length > 0); suffix += 1) slug = `${base}-${suffix}`;
  const result = await db.transaction(async (tx) => {
    const [organizer] = await tx.select({ autoEventApproval: organizers.autoEventApproval }).from(organizers).where(eq(organizers.id, principal.organizerId)).limit(1);
    const savedStatus = parsed.data.status === "published" ? (organizer?.autoEventApproval ? "published" : "pending_approval") : "draft";
    const visibility = parsed.data.visibility === "public" ? "public" : "private";
    const privateListing = parsed.data.visibility === "private-listed" ? "listed" : parsed.data.visibility === "private-unlisted" ? "unlisted" : null;
    const [event] = await tx.insert(events).values({
      organizerId: principal.organizerId, createdByUserId: principal.userId, slug, title: parsed.data.title, shortTitle: parsed.data.title, category: parsed.data.category,
      status: savedStatus, visibility, privateListing, pricingMode: parsed.data.pricingMode, admissionMode: parsed.data.admissionMode,
      currency: parsed.data.currency.toUpperCase(), startAt: new Date(parsed.data.startAt), endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      timezone: parsed.data.timezone, venue: parsed.data.venue, address: parsed.data.address, city: parsed.data.city,
      accent: parsed.data.accent, capacity: parsed.data.seating?.objects.reduce((sum, object) => sum + object.seatCount, 0) ?? parsed.data.capacity, publishedAt: savedStatus === "published" ? new Date() : null,
    }).returning();
    await tx.insert(eventPages).values({ eventId: event.id, config: pageConfig as never });
    const categories = parsed.data.admissionMode === "selectable" ? [] : parsed.data.ticketCategories;
    if (categories.length) await tx.insert(ticketCategories).values(categories.map((category, index) => ({ eventId: event.id, name: category.name, description: category.description, priceMinor: parsed.data.pricingMode === "free" ? 0 : Math.round(category.price * 100), quantityAvailable: category.quantityAvailable, color: category.color, sortOrder: index })));
    if (parsed.data.questions.length) await tx.insert(registrationQuestions).values(parsed.data.questions.map((question, index) => ({ eventId: event.id, label: question.label, type: question.type, scope: question.scope, required: question.required, placeholder: question.placeholder || null, helpText: question.helpText || null, options: question.options, validation: { min: question.min || null, max: question.max || null }, sortOrder: index })));
    if (parsed.data.admissionMode === "selectable" && parsed.data.seating) {
      const bandIds = new Map<string, string>();
      for (const band of parsed.data.seating.bands) {
        const [savedBand] = await tx.insert(priceBands).values({ eventId: event.id, name: band.name, priceMinor: parsed.data.pricingMode === "free" ? 0 : Math.round(band.price * 100), color: band.color }).returning({ id: priceBands.id });
        bandIds.set(band.id, savedBand.id);
      }
      for (const [sortOrder, object] of parsed.data.seating.objects.entries()) {
        const [savedObject] = await tx.insert(layoutObjects).values({ eventId: event.id, type: object.type, label: object.label, presentation: { clientId: object.id, x: object.x, y: object.y, width: object.width, height: object.height, rotation: object.rotation, seatCount: object.seatCount, canvas: parsed.data.seating.canvas }, sortOrder }).returning({ id: layoutObjects.id });
        if (!object.seatCount) continue;
        await tx.insert(seats).values(Array.from({ length: object.seatCount }, (_, index) => {
          const stableKey = `${object.id}-seat-${String(index + 1).padStart(2, "0")}`;
          const edit = parsed.data.seating!.seatEdits[`${object.id}:${index}`];
          const status = edit?.status ?? "available";
          return { eventId: event.id, layoutObjectId: savedObject.id, stableKey, label: `${object.label} · Seat ${String(index + 1).padStart(2, "0")}`, shortLabel: String(index + 1).padStart(2, "0"), priceBandId: bandIds.get(edit?.priceBandId ?? object.priceBandId ?? "") ?? null, status, reservedFor: status === "reserved" ? edit?.note ?? null : null, blockedReason: status === "blocked" || status === "unavailable" ? edit?.note ?? null : null };
        }));
      }
    }
    return event;
  });
  await writeAudit({ organizerId: principal.organizerId, eventId: result.id, actorUserId: principal.userId, action: result.status === "published" ? "event.published_auto_approved" : parsed.data.status === "published" ? "event.submitted_for_approval" : "event.created", targetType: "event", targetId: result.id, requestId: id, metadata: { slug: result.slug, admissionMode: result.admissionMode, pricingMode: result.pricingMode } });
  return ok({ id: result.id, slug: result.slug, status: result.status }, 201, id);
}
