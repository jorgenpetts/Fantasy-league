import assert from "node:assert/strict";
import test from "node:test";
import { getSafeNextPath, isAdminRoute, isProtectedRoute } from "../../lib/routes.ts";

test("login return destinations stay on the app origin", () => {
  for (const path of ["//evil.test", "/\\evil.test", "/\n/evil.test", "https://evil.test", "/login"]) {
    assert.equal(getSafeNextPath(path), "/");
  }
  assert.equal(getSafeNextPath("/leaderboard?roundId=r1"), "/leaderboard?roundId=r1");
});

test("all admin descendants use the existing authenticated ADMIN route boundary", () => {
  for (const path of [
    "/admin",
    "/admin/players",
    "/admin/seasons",
    "/admin/rounds",
    "/admin/performances",
    "/admin/players/example",
  ]) {
    assert.equal(isAdminRoute(path), true);
    assert.equal(isProtectedRoute(path), true);
  }
  assert.equal(isAdminRoute("/administrator"), false);
  assert.equal(isProtectedRoute("/403"), true);
  assert.equal(isAdminRoute("/403"), false);
});
