import assert from "node:assert/strict";
import test from "node:test";
import { loginDestination } from "../lib/auth/redirect";

test("superadmin without an organizer always has an accessible destination", () => {
  for (const path of [null, "/organizer", "/organizer/settings?mfa=required", "/organizer/events/new"]) {
    assert.equal(loginDestination(path, true), "/platform");
  }
});
test("organizers land in their workspace and keep valid return paths", () => {
  assert.equal(loginDestination(null, false), "/organizer");
  assert.equal(loginDestination("/platform", false), "/organizer");
  assert.equal(loginDestination("/organizer/events/new", false), "/organizer/events/new");
});
test("login never redirects to an external origin", () => {
  for (const path of ["https://example.com", "//example.com", "/\\example.com", "/\n/example.com"]) {
    assert.equal(loginDestination(path, true), "/platform");
    assert.equal(loginDestination(path, false), "/organizer");
  }
});
