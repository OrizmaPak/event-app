import assert from "node:assert/strict";
import test from "node:test";
import { emptyResource, filterResources, normalizeTerm, parseResourceQuery, resourceContentSchema, submissionErrors, type PublicResource } from "../lib/resources/model";
const c1 = "10000000-0000-4000-8000-000000000001", c2 = "10000000-0000-4000-8000-000000000002", e1 = "10000000-0000-4000-8000-000000000003";
function item(id: string, category: string, eventType: string, location: string): PublicResource {
  return { id, slug: id, provider: "Provider", publishedAt: `2026-10-${id.padStart(2, "0")}T12:00:00Z`, content: { ...emptyResource, title: `Listing ${id}`, location }, categories: [{ id: category, kind: "category", name: category === c1 ? "DJs" : "Ushers", status: "approved", mergedIntoId: null }], eventTypes: [{ id: eventType, kind: "eventType", name: "Weddings", status: "approved", mergedIntoId: null }] };
}
const records = [item("1", c1, e1, "Lagos"), item("2", c2, e1, "Abuja"), item("3", c2, "other", "Lagos")];
test("multi-select uses OR within a group and AND across groups", () => {
  const query = parseResourceQuery(new URLSearchParams(`category=${c1}&category=${c2}&eventType=${e1}&location=Lagos`));
  assert.deepEqual(filterResources(records, query).items.map((row) => row.id), ["1"]);
});
test("facets adapt while keeping selected zero-count options", () => {
  const results = filterResources(records, parseResourceQuery(new URLSearchParams(`category=${c1}&location=Abuja&eventType=missing`)));
  assert.equal(results.total, 0);
  assert.ok(results.facets.categories.some((option) => option.id === c1 && option.count === 0));
  assert.ok(results.facets.eventTypes.some((option) => option.id === "missing" && option.count === 0));
});
test("pagination, deterministic sorting, and invalid page clamp", () => {
  const items = Array.from({ length: 27 }, (_, index) => item(String(index + 1), c1, e1, "Lagos"));
  const result = filterResources(items, parseResourceQuery(new URLSearchParams("page=999")));
  assert.equal(result.page, 2); assert.equal(result.items.length, 3);
  assert.equal(parseResourceQuery(new URLSearchParams("page=-9")).page, 1);
  assert.equal(filterResources(records, parseResourceQuery(new URLSearchParams("sort=title"))).items[0].id, "1");
});
test("submission requires services and explicit contact, drafts may be incomplete", () => {
  assert.equal(resourceContentSchema.safeParse(emptyResource).success, true);
  assert.equal(submissionErrors(emptyResource).length, 6);
  assert.equal(submissionErrors({ ...emptyResource, title: "Service", subtitle: "Subtitle", description: "Description", categoryIds: [c1], eventTypeIds: [e1], contact: { ...emptyResource.contact, email: "provider@example.com" } }).length, 0);
  assert.equal(submissionErrors({ ...emptyResource, title: "Service", subtitle: "Subtitle", description: "Description", categoryIds: [c1], eventTypeIds: [e1], contact: { ...emptyResource.contact, phone: "0801 234 5678" } }).length, 0);
  assert.equal(resourceContentSchema.safeParse({ ...emptyResource, contact: { ...emptyResource.contact, phone: "not a phone" } }).success, false);
});
test("unsafe links and oversized galleries fail validation", () => {
  assert.equal(resourceContentSchema.safeParse({ ...emptyResource, contact: { ...emptyResource.contact, website: "javascript:alert(1)" } }).success, false);
  assert.equal(resourceContentSchema.safeParse({ ...emptyResource, images: Array.from({ length: 6 }, () => ({ assetId: c1, url: "https://example.com/image.png", alt: "Image" })) }).success, false);
  assert.equal(normalizeTerm("  Event   Planners "), "event planners");
});
