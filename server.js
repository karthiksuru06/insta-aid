import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

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

// ✅ Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
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
  message: { success: false, message: "Too many requests, please try again later." }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many sensitive requests, please try again later." }
});

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
const requireAdmin = (req, res, next) => {
  if (req.user.email !== "instaaid08@gmail.com" && req.user.admin !== true) {
    console.warn(`[SECURITY] Non-admin user ${req.user.email} attempted admin access`);
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
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
// ADMIN ENDPOINTS (Strictly Protected)
// ==========================================

app.post("/api/admin/set-claim", verifyToken, requireAdmin, strictLimiter, async (req, res) => {
  try {
    const { targetUid, role } = req.body;
    if (!targetUid || !role) {
      return res.status(400).json({ success: false, message: "Missing targetUid or role" });
    }

    if (!["user", "moderator", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
    }

    const isAdmin = role === "admin" || role === "superadmin" || role === "moderator";
    await admin.auth().setCustomUserClaims(targetUid, { admin: isAdmin, role: role });
    
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
    const { search, limit = 50 } = req.query;
    let query = db.collection("users").limit(Number(limit));
    
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
    
    if (!["Active", "Inactive", "Suspended"].includes(status)) {
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

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Production Backend running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});