// lib/security.mjs
// Pure, dependency-free security helpers shared by the backend.
// Kept side-effect-free so they can be unit-tested without Firebase/Express.

/** Parse a comma-separated CORS_ORIGIN value into a clean array of origins. */
export function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Decide whether a request Origin is allowed.
 * - No Origin (non-browser / same-origin) → allowed.
 * - In the allowlist → allowed.
 * - Non-production with an empty allowlist → allowed (local dev convenience).
 * - Otherwise → denied.
 */
export function isOriginAllowed(origin, allowedOrigins, isProduction) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (!isProduction && allowedOrigins.length === 0) return true;
  return false;
}

/** Clamp a requested page size into [min, max], falling back when invalid. */
export function clampLimit(rawLimit, { min = 1, max = 100, fallback = 50 } = {}) {
  const n = Number(rawLimit);
  if (!Number.isFinite(n) || n <= 0) return Math.min(Math.max(fallback, min), max);
  return Math.min(Math.max(Math.floor(n), min), max);
}

export const VALID_ROLES = ["user", "moderator", "admin", "superadmin"];
export const ELEVATED_ROLES = ["admin", "superadmin"];

/** Whether a role string is recognised. */
export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

/** Only admin/superadmin carry the broad `admin` custom claim. */
export function roleGrantsAdminClaim(role) {
  return ELEVATED_ROLES.includes(role);
}

/**
 * Authorization rule for granting a role: only a superadmin may assign the
 * elevated (admin/superadmin) roles. Returns true if the grant is permitted.
 */
export function canGrantRole(callerRole, targetRole) {
  if (!isValidRole(targetRole)) return false;
  if (ELEVATED_ROLES.includes(targetRole)) return callerRole === "superadmin";
  return true;
}

/**
 * Authorization rule for MODIFYING an existing account's claims. canGrantRole
 * only guards the *new* role, so a regular admin could overwrite a peer admin or
 * superadmin down to 'user' (lateral demotion / lockout). Block that: only a
 * superadmin may modify an account that currently holds an elevated role.
 * `targetCurrentRole` is the target's existing role (may be undefined for a
 * never-elevated account). Returns true if the modification is permitted.
 */
export function canModifyTarget(callerRole, targetCurrentRole) {
  if (ELEVATED_ROLES.includes(targetCurrentRole)) {
    return callerRole === "superadmin";
  }
  return true;
}

export const VALID_USER_STATUSES = ["Active", "Inactive", "Suspended"];
export function isValidStatus(status) {
  return VALID_USER_STATUSES.includes(status);
}

/** Search term must be a string no longer than maxLen (undefined is allowed). */
export function isValidSearchTerm(search, maxLen = 100) {
  if (search === undefined) return true;
  return typeof search === "string" && search.length <= maxLen;
}

/** Valid WGS84 coordinate: finite numbers within lat [-90,90], lng [-180,180]. */
export function isValidCoordinate(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Express middleware setting hardening headers for a JSON API.
 * No external dependency (avoids pulling in helmet).
 */
export function securityHeaders() {
  return (req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-DNS-Prefetch-Control", "off");
    res.set("Cross-Origin-Resource-Policy", "same-origin");
    // API serves no HTML/scripts — lock everything down.
    res.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    // Only advertise HSTS over TLS (Render terminates TLS at the edge).
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  };
}
