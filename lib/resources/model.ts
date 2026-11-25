import { z } from "zod";

export const categoryNames = ["Event planners and coordinators", "Ushers and guest management", "MCs and hosts", "Comedians", "DJs", "Musicians and live bands", "Dancers and performers", "Photographers", "Videographers", "Decorators and florists", "Caterers", "Bakers and cake makers", "Drinks and bartending", "Venues", "Furniture and equipment rentals", "Sound, lighting and staging", "Security", "Transport", "Makeup and styling", "Invitation and printing services", "Funeral and memorial services"];
export const eventTypeNames = ["Weddings", "Engagements", "Traditional marriages", "Birthdays", "Baby showers", "Naming ceremonies", "Anniversaries", "Funerals and memorials", "Conferences", "Seminars", "Workshops", "Exhibitions", "Corporate events", "Product launches", "Award ceremonies", "Graduations", "Concerts", "Comedy shows", "Festivals", "Cultural celebrations", "Religious gatherings", "Parties", "Club nights", "Charity and community events"];
export const normalizeTerm = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
const contactText = z.string().trim().max(120);
const phone = z.union([z.literal(""), contactText.regex(/^(?=(?:.*\d){7,})\+?[\d\s().-]{7,30}$/, "Enter a valid phone number, including country code.")]);
export const resourceContentSchema = z.object({
  title: z.string().trim().max(120), subtitle: z.string().trim().max(200), description: z.string().trim().max(8000), location: z.string().trim().max(120), serviceArea: z.string().trim().max(240),
  categoryIds: z.array(z.string().uuid()).max(30), eventTypeIds: z.array(z.string().uuid()).max(40),
  images: z.array(z.object({ assetId: z.string().uuid(), url: z.string().url(), alt: z.string().trim().min(2).max(240) })).max(5),
  contact: z.object({ phone, whatsapp: phone, email: z.union([z.literal(""), z.string().trim().email().max(254)]), website: z.union([z.literal(""), z.string().url().max(1000).refine((value) => /^https?:\/\//i.test(value), "Use an http or https website address.")]) }),
});
export type ResourceContent = z.infer<typeof resourceContentSchema>;
export const emptyResource: ResourceContent = { title: "", subtitle: "", description: "", location: "", serviceArea: "", categoryIds: [], eventTypeIds: [], images: [], contact: { phone: "", whatsapp: "", email: "", website: "" } };
export function submissionErrors(content: ResourceContent) {
  return [!content.title && "Add a title.", !content.subtitle && "Add a subtitle.", !content.description && "Describe your service.", !content.categoryIds.length && "Choose at least one service category.", !content.eventTypeIds.length && "Choose at least one event type.", !Object.values(content.contact).some(Boolean) && "Add at least one contact method."].filter(Boolean) as string[];
}
export type ResourceTerm = { id: string; kind: "category" | "eventType"; name: string; status: string; mergedIntoId: string | null };
export type Publisher = { id: string; name: string; type: "personal" | "organization"; canManage: boolean };
export type PublicResource = { id: string; slug: string; content: ResourceContent; provider: string; categories: ResourceTerm[]; eventTypes: ResourceTerm[]; publishedAt: string };
export type ManagedResource = { id: string; slug: string; content: ResourceContent; approvedContent: ResourceContent | null; publication: string; review: string; version: number; approvedVersion: number | null; ownerUserId: string | null; organizerId: string | null; reason: string; updatedAt: string; provider: string; canManage: boolean };
export type ResourceQuery = { q: string; categories: string[]; eventTypes: string[]; locations: string[]; sort: "newest" | "title"; page: number };
export function parseResourceQuery(params: URLSearchParams): ResourceQuery {
  return { q: (params.get("q") ?? "").slice(0, 200), categories: params.getAll("category"), eventTypes: params.getAll("eventType"), locations: params.getAll("location"), sort: params.get("sort") === "title" ? "title" : "newest", page: Math.max(1, Math.min(100000, Number(params.get("page")) || 1)) };
}
export function filterResources(items: PublicResource[], query: ResourceQuery) {
  const matches = (item: PublicResource, ignore?: "category" | "eventType" | "location") => {
    const content = item.content;
    return (!query.q || [content.title, content.subtitle, content.description, content.location, content.serviceArea, item.provider, ...item.categories.map((term) => term.name), ...item.eventTypes.map((term) => term.name)].join(" ").toLowerCase().includes(query.q.toLowerCase()))
      && (ignore === "category" || !query.categories.length || item.categories.some((term) => query.categories.includes(term.id)))
      && (ignore === "eventType" || !query.eventTypes.length || item.eventTypes.some((term) => query.eventTypes.includes(term.id)))
      && (ignore === "location" || !query.locations.length || query.locations.includes(content.location));
  };
  const facet = (kind: "category" | "eventType" | "location", selected: string[]) => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const item of items.filter((row) => matches(row, kind))) {
      const values = kind === "location" ? item.content.location ? [{ id: item.content.location, name: item.content.location }] : [] : kind === "category" ? item.categories : item.eventTypes;
      for (const value of values) { const previous = counts.get(value.id); counts.set(value.id, { id: value.id, name: value.name, count: (previous?.count ?? 0) + 1 }); }
    }
    for (const id of selected) if (!counts.has(id)) {
      const term = items.flatMap((item) => kind === "category" ? item.categories : item.eventTypes).find((value) => value.id === id);
      counts.set(id, { id, name: kind === "location" ? id : term?.name ?? "Unavailable option", count: 0 });
    }
    return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
  };
  const filtered = items.filter((item) => matches(item)).sort((a, b) => query.sort === "title" ? a.content.title.localeCompare(b.content.title) || a.id.localeCompare(b.id) : b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 24));
  const page = Math.min(Math.floor(query.page), pageCount);
  return { items: filtered.slice((page - 1) * 24, page * 24), total: filtered.length, page, pageCount, facets: { categories: facet("category", query.categories), eventTypes: facet("eventType", query.eventTypes), locations: facet("location", query.locations) } };
}
export type ResourceResults = ReturnType<typeof filterResources>;
