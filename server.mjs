import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";
import {
  parseOrigins,
  isOriginAllowed,
  clampLimit,
  isValidRole,
  roleGrantsAdminClaim,
  canGrantRole,
  isValidStatus,
  isValidSearchTerm,
  isValidCoordinate,
  securityHeaders,
} from "./lib/security.mjs";

dotenv.config();

// Initialize Firebase Admin
// Note: For token verification only, projectId is sufficient. 
// For writing to Firestore from the backend, a Service Account key is required.
const firebaseConfig = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : { projectId: process.env.FIREBASE_PROJECT_ID || "instaaid-43394" };

admin.initializeApp({
  credential: process.env.FIREBASE_SERVICE_ACCOUNT 
    ? admin.credential.cert(firebaseConfig)
    : admin.credential.applicationDefault(),
  projectId: firebaseConfig.projectId,
});

const db = getFirestore();
const app = express();
const PORT = process.env.PORT || 5000;

// Don't advertise the framework.
app.disable("x-powered-by");

// ✅ Hardening headers (HSTS, nosniff, no-frame, restrictive CSP for an API).
app.use(securityHeaders());

// ✅ Middlewares
// CORS: allow only the origins listed in CORS_ORIGIN (comma-separated).
// Fail safe — if CORS_ORIGIN is missing in production we deny cross-origin
// requests rather than silently allowing "*".
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN);

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin, allowedOrigins, isProduction)) return callback(null, true);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

if (isProduction && allowedOrigins.length === 0) {
  console.warn("[SECURITY] CORS_ORIGIN is not set in production — all cross-origin browser requests will be rejected.");
}
app.use(express.json({ limit: '10kb' }));

// ✅ Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ✅ Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: "Too many requests, please try again later." },
  // The high-frequency background location relay has its own limiter below.
  skip: (req) => req.originalUrl.startsWith("/api/tracking/location"),
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many sensitive requests, please try again later." }
});

// Frequent but lightweight: background SOS location relay updates.
const relayLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: "Too many tracking updates, slow down." }
});

// SHA-256 of the per-session relay write secret (compared in constant time).
const hashSecret = (secret) => crypto.createHash("sha256").update(secret).digest("hex");

app.use("/api/", apiLimiter);

// ✅ Authentication Middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing Token" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error(`[AUTH ERROR] Token verification failed: ${error.message}`);
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid Token" });
  }
};

// ✅ Admin Authorization Middleware
// RBAC is driven by Firebase custom claims (admin === true). For initial
// bootstrap only, ADMIN_EMAILS (comma-separated) may grant access until the
// first claim is set — leave it unset once a real admin exists.
const bootstrapAdminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const requireAdmin = (req, res, next) => {
  const isClaimAdmin = req.user.admin === true;
  // Bootstrap path must require a verified email — an email claim alone is
  // spoofable (e.g. unverified password sign-up using an admin's address).
  const isBootstrapAdmin = req.user.email
    && req.user.email_verified === true
    && bootstrapAdminEmails.includes(req.user.email.toLowerCase());
  if (!isClaimAdmin && !isBootstrapAdmin) {
    console.warn(`[SECURITY] Non-admin user ${req.user.email} attempted admin access`);
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
  }
  next();
};

// ✅ Superadmin-only middleware (for privilege-granting actions)
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== "superadmin") {
    console.warn(`[SECURITY] User ${req.user.email} attempted superadmin-only action`);
    return res.status(403).json({ success: false, message: "Forbidden: Superadmin access required." });
  }
  next();
};

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// ✅ Test endpoint (to verify server is reachable) - Public
app.get("/api/test", (req, res) => {
  console.log("✅ [TEST] Server is reachable!");
  res.json({ success: true, message: "Server is working", timestamp: new Date() });
});

// ✅ Health Check Endpoint - Required for Render
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ==========================================
// USER ENDPOINTS (Protected)
// ==========================================

app.post("/api/sos/trigger", verifyToken, strictLimiter, async (req, res) => {
  try {
    const { location, contacts, type } = req.body;
    if (!location || !type) {
      return res.status(400).json({ success: false, message: "Missing location or type" });
    }

    // Log SOS event to Firestore securely from backend
    const alertRef = await db.collection("alerts").add({
      userId: req.user.uid,
      userEmail: req.user.email,
      type,
      location,
      contactsNotified: contacts || [],
      timestamp: Timestamp.now(),
      status: "ACTIVE"
    });

    console.log(`[SOS] Emergency triggered by ${req.user.email}, Alert ID: ${alertRef.id}`);
    res.json({ success: true, message: "SOS logged successfully", alertId: alertRef.id });
  } catch (error) {
    console.error("[SOS ERROR]", error);
    res.status(500).json({ success: false, message: "Failed to process SOS" });
  }
});

// ==========================================
// LIVE TRACKING RELAY (background-safe)
// ==========================================
// Lets the mobile background-location task push updates even when the app is
// fully terminated and Firebase Auth is unavailable. Instead of weakening
// Firestore rules, the owner registers a per-session write secret (while still
// authenticated), and the headless task authenticates with THAT secret. The
// backend writes via the Admin SDK. Secret hashes live in `trackingSecrets`,
// which is denied to all clients by the security rules.

// 1) Register a write secret for a session the caller owns. Auth required.
app.post("/api/tracking/register", verifyToken, strictLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ success: false, message: "Missing token" });
    }
    const snap = await db.collection("trackingSessions").doc(token).get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (snap.data().userId !== req.user.uid) {
      return res.status(403).json({ success: false, message: "Not your session" });
    }
    const secret = crypto.randomBytes(32).toString("hex");
    await db.collection("trackingSecrets").doc(token).set({
      writeSecretHash: hashSecret(secret),
      userId: req.user.uid,
      expiresAt: snap.data().expiresAt ?? null,
      createdAt: Timestamp.now(),
    });
    res.json({ success: true, secret });
  } catch (error) {
    console.error("[TRACK REGISTER ERROR]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 2) Relay a location update. No Firebase auth — the per-session secret is the
// credential. Validates coordinates and session liveness before writing.
app.post("/api/tracking/location", relayLimiter, async (req, res) => {
  try {
    const { token, secret, latitude, longitude, accuracy, speed, heading, battery, deviceTimeMs } = req.body;
    if (!token || !secret || typeof token !== "string" || typeof secret !== "string") {
      return res.status(400).json({ success: false, message: "Missing token or secret" });
    }
    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: "Invalid coordinates" });
    }
    if (!(await verifyTrackingSecret(token, secret))) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const sessionRef = db.collection("trackingSessions").doc(token);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    const session = sessionSnap.data();
    if (session.status !== "ACTIVE") {
      return res.status(409).json({ success: false, message: "Session not active" });
    }
    if (session.expiresAt && session.expiresAt.toMillis() < Date.now()) {
      return res.status(410).json({ success: false, message: "Session expired" });
    }
    await sessionRef.update({
      location: {
        latitude,
        longitude,
        accuracy: typeof accuracy === "number" ? accuracy : null,
        speed: typeof speed === "number" ? speed : null,
        heading: typeof heading === "number" ? heading : null,
        battery: typeof battery === "number" ? battery : null,
        timestamp: typeof deviceTimeMs === "number" ? Timestamp.fromMillis(deviceTimeMs) : Timestamp.now(),
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("[TRACK LOCATION ERROR]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 3) End a session via the relay secret (background End-SOS path).
app.post("/api/tracking/end", relayLimiter, async (req, res) => {
  try {
    const { token, secret } = req.body;
    if (!token || !secret || typeof token !== "string" || typeof secret !== "string") {
      return res.status(400).json({ success: false, message: "Missing token or secret" });
    }
    if (!(await verifyTrackingSecret(token, secret))) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    await db.collection("trackingSessions").doc(token).update({
      status: "ENDED",
      endedAt: Timestamp.now(),
      location: null,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("[TRACK END ERROR]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Constant-time check of a session's relay write secret.
async function verifyTrackingSecret(token, secret) {
  const secretSnap = await db.collection("trackingSecrets").doc(token).get();
  if (!secretSnap.exists) return false;
  const storedHash = secretSnap.data().writeSecretHash;
  if (typeof storedHash !== "string") return false;
  const provided = hashSecret(secret);
  if (provided.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(storedHash));
}

// ==========================================
// ADMIN ENDPOINTS (Strictly Protected)
// ==========================================

app.post("/api/admin/set-claim", verifyToken, requireAdmin, strictLimiter, async (req, res) => {
  try {
    const { targetUid, role } = req.body;
    if (!targetUid || !role) {
      return res.status(400).json({ success: false, message: "Missing targetUid or role" });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
    }

    // Privilege-escalation guard: only a superadmin may grant the admin or
    // superadmin roles. Regular admins/moderators can only assign user/moderator.
    if (!canGrantRole(req.user.role, role)) {
      console.warn(`[SECURITY] ${req.user.email} (role=${req.user.role}) attempted to grant '${role}' to ${targetUid}`);
      return res.status(403).json({ success: false, message: "Only a superadmin can grant admin privileges." });
    }

    // Prevent a user from changing their own role (e.g. self-demotion locking
    // out the last superadmin, or self-promotion via a stolen lower token).
    if (targetUid === req.user.uid) {
      return res.status(400).json({ success: false, message: "You cannot change your own role." });
    }

    // Only admin/superadmin carry the broad `admin` claim. Moderators do not.
    await admin.auth().setCustomUserClaims(targetUid, { admin: roleGrantsAdminClaim(role), role });
    
    // Log admin action
    await db.collection("adminLogs").add({
      action: "SET_CLAIM",
      performedBy: req.user.email,
      targetUid,
      newRole: role,
      timestamp: Timestamp.now()
    });

    res.json({ success: true, message: `Successfully set claim for user ${targetUid}` });
  } catch (error) {
    console.error("[ADMIN CLAIM ERROR]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/api/admin/users", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    // Clamp the page size to a safe range to avoid resource exhaustion.
    const limit = clampLimit(req.query.limit);

    // Bound the search term length to avoid pathological inputs.
    if (!isValidSearchTerm(search)) {
      return res.status(400).json({ success: false, message: "Invalid search term" });
    }

    let query = db.collection("users").limit(limit);
    
    // Note: For production, use Algolia or Firestore composite indexes for robust search.
    // This is a basic in-memory filter for small datasets.
    const snapshot = await query.get();
    let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const lowerSearch = search.toString().toLowerCase();
      users = users.filter(u => 
        (u.email && u.email.toLowerCase().includes(lowerSearch)) ||
        (u.name && u.name.toLowerCase().includes(lowerSearch))
      );
    }

    res.json({ success: true, data: users, count: users.length });
  } catch (error) {
    console.error("[ADMIN USERS ERROR]", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

app.put("/api/admin/users/:uid/status", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { status } = req.body;
    
    if (!isValidStatus(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    await db.collection("users").doc(uid).update({
      status,
      lastStatusUpdate: Timestamp.now(),
      updatedBy: req.user.email
    });

    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (error) {
    console.error("[ADMIN STATUS ERROR]", error);
    res.status(500).json({ success: false, message: "Failed to update user status" });
  }
});

app.get("/api/admin/analytics", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [usersSnap, alertsSnap, feedbackSnap] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("alerts").where("timestamp", ">", new Date(Date.now() - 24 * 60 * 60 * 1000)).count().get(),
      db.collection("contactSubmissions").count().get()
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: usersSnap.data().count,
        alertsLast24h: alertsSnap.data().count,
        totalFeedback: feedbackSnap.data().count
      }
    });
  } catch (error) {
    console.error("[ADMIN ANALYTICS ERROR]", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
});

// Start the server only when this file is run directly (`node server.mjs`),
// so it can be imported by tests without binding a port.
const isRunDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isRunDirectly) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Production Backend running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

export { app };