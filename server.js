import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin for verifying tokens
// For just verifying ID tokens, projectId is sufficient. 
// No service account JSON is needed unless you want to write to Firestore from the backend.
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || "instaaid-43394",
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ Authentication Middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing Token" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Attach user payload to request
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid Token" });
  }
};

// ✅ Test endpoint (to verify server is reachable) - Public
app.get("/api/test", (req, res) => {
  console.log("✅ [TEST] Server is reachable!");
  res.json({ success: true, message: "Server is working", timestamp: new Date() });
});

// ✅ Fake call trigger - PROTECTED
app.post("/api/fakecall", verifyToken, (req, res) => {
  console.log(`[FAKECALL] Triggered by user: ${req.user.email}`);
  res.json({ message: "Fake call triggered!", data: req.body });
});

// ✅ Filter alerts endpoint - PROTECTED
app.post("/api/alerts/filter", verifyToken, (req, res) => {
  try {
    const { startDate, endDate, location, status, severity } = req.body;
    
    console.log(`🔍 [FILTER REQUEST] From user: ${req.user.email}`);
    console.log("Params:", { startDate, endDate, location, status, severity });

    // Validate at least one filter is provided
    if (!startDate && !endDate && !location && !status && !severity) {
      console.warn("⚠️  [FILTER] No filter parameters provided");
      return res.status(400).json({
        success: false,
        message: "At least one filter parameter required",
      });
    }

    // Returning mock response to confirm endpoint works
    const mockFilters = { startDate, endDate, location, status, severity };
    res.json({
      success: true,
      message: "Alerts filtered successfully",
      data: [],
      filters: mockFilters,
    });
  } catch (error) {
    console.error("❌ [FILTER ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Error filtering alerts",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Production-Ready Server running on port ${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   - GET  /api/test (Public)`);
  console.log(`   - POST /api/fakecall (Protected)`);
  console.log(`   - POST /api/alerts/filter (Protected)`);
});
