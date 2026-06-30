// tests/security.test.mjs
// Unit tests for the backend security helpers. Runnable with zero install:
//   node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrigins,
  isOriginAllowed,
  clampLimit,
  isValidRole,
  roleGrantsAdminClaim,
  canGrantRole,
  canModifyTarget,
  isValidStatus,
  isValidSearchTerm,
  isValidCoordinate,
  securityHeaders,
} from "../lib/security.mjs";

test("isValidCoordinate accepts valid lat/lng and rejects out-of-range/non-finite", () => {
  assert.equal(isValidCoordinate(12.97, 77.59), true);
  assert.equal(isValidCoordinate(0, 0), true);
  assert.equal(isValidCoordinate(-90, 180), true);
  assert.equal(isValidCoordinate(91, 0), false);
  assert.equal(isValidCoordinate(0, 181), false);
  assert.equal(isValidCoordinate(NaN, 0), false);
  assert.equal(isValidCoordinate("12", 77), false);
  assert.equal(isValidCoordinate(Infinity, 0), false);
});

test("parseOrigins splits, trims and drops empties", () => {
  assert.deepEqual(parseOrigins("a.com, b.com ,, c.com"), ["a.com", "b.com", "c.com"]);
  assert.deepEqual(parseOrigins(""), []);
  assert.deepEqual(parseOrigins(undefined), []);
});

test("isOriginAllowed: no origin (non-browser) is allowed", () => {
  assert.equal(isOriginAllowed(undefined, [], true), true);
});

test("isOriginAllowed: allowlisted origin passes in production", () => {
  assert.equal(isOriginAllowed("https://app.com", ["https://app.com"], true), true);
});

test("isOriginAllowed: unlisted origin is denied in production (no '*' fallback)", () => {
  assert.equal(isOriginAllowed("https://evil.com", ["https://app.com"], true), false);
  // Even with an empty allowlist, production must NOT allow arbitrary origins.
  assert.equal(isOriginAllowed("https://evil.com", [], true), false);
});

test("isOriginAllowed: dev convenience allows any origin when allowlist empty", () => {
  assert.equal(isOriginAllowed("http://localhost:3000", [], false), true);
});

test("clampLimit bounds the page size to [1,100] with a fallback", () => {
  assert.equal(clampLimit(50), 50);
  assert.equal(clampLimit(999999), 100);
  assert.equal(clampLimit(0), 50);          // invalid -> fallback
  assert.equal(clampLimit(-5), 50);         // invalid -> fallback
  assert.equal(clampLimit("abc"), 50);      // NaN -> fallback
  assert.equal(clampLimit(7), 7);
  assert.equal(clampLimit(150), 100);
});

test("isValidRole recognises only known roles", () => {
  for (const r of ["user", "moderator", "admin", "superadmin"]) assert.equal(isValidRole(r), true);
  assert.equal(isValidRole("root"), false);
  assert.equal(isValidRole(undefined), false);
});

test("roleGrantsAdminClaim: only admin/superadmin carry the admin claim", () => {
  assert.equal(roleGrantsAdminClaim("admin"), true);
  assert.equal(roleGrantsAdminClaim("superadmin"), true);
  assert.equal(roleGrantsAdminClaim("moderator"), false); // key fix: moderator is NOT admin
  assert.equal(roleGrantsAdminClaim("user"), false);
});

test("canGrantRole: only superadmin may grant elevated roles", () => {
  assert.equal(canGrantRole("superadmin", "admin"), true);
  assert.equal(canGrantRole("superadmin", "superadmin"), true);
  assert.equal(canGrantRole("admin", "admin"), false);       // escalation blocked
  assert.equal(canGrantRole("admin", "superadmin"), false);  // escalation blocked
  assert.equal(canGrantRole("moderator", "admin"), false);
  // Non-elevated grants are allowed for any admin-level caller.
  assert.equal(canGrantRole("admin", "moderator"), true);
  assert.equal(canGrantRole("admin", "user"), true);
  // Unknown target role is rejected.
  assert.equal(canGrantRole("superadmin", "root"), false);
});

test("canModifyTarget: only superadmin may modify an elevated account (no lateral demotion)", () => {
  // A regular admin must NOT be able to overwrite/demote a peer admin or a superadmin.
  assert.equal(canModifyTarget("admin", "admin"), false);
  assert.equal(canModifyTarget("admin", "superadmin"), false);
  assert.equal(canModifyTarget("moderator", "admin"), false);
  // Superadmin may modify any account.
  assert.equal(canModifyTarget("superadmin", "admin"), true);
  assert.equal(canModifyTarget("superadmin", "superadmin"), true);
  // Modifying a non-elevated (or never-elevated/undefined) account is allowed for admins.
  assert.equal(canModifyTarget("admin", "user"), true);
  assert.equal(canModifyTarget("admin", "moderator"), true);
  assert.equal(canModifyTarget("admin", undefined), true);
});

test("isValidStatus accepts only the known statuses", () => {
  assert.equal(isValidStatus("Active"), true);
  assert.equal(isValidStatus("Suspended"), true);
  assert.equal(isValidStatus("deleted"), false);
});

test("isValidSearchTerm: undefined ok, long/non-string rejected", () => {
  assert.equal(isValidSearchTerm(undefined), true);
  assert.equal(isValidSearchTerm("john"), true);
  assert.equal(isValidSearchTerm("x".repeat(101)), false);
  assert.equal(isValidSearchTerm(12345), false);
});

test("securityHeaders sets the expected hardening headers", () => {
  const set = {};
  const res = { set: (k, v) => { set[k] = v; } };
  let nextCalled = false;
  securityHeaders()({}, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(set["X-Content-Type-Options"], "nosniff");
  assert.equal(set["X-Frame-Options"], "DENY");
  assert.match(set["Content-Security-Policy"], /default-src 'none'/);
  assert.match(set["Strict-Transport-Security"], /max-age=\d+/);
});
