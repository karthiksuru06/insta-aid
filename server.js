// server.js
import express from "express";
import cors from "cors";

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ Test endpoint (to verify server is reachable)
app.get("/api/test", (req, res) => {
  console.log("✅ [TEST] Server is reachable!");
  res.json({ success: true, message: "Server is working", timestamp: new Date() });
});

// Dummy in-memory users
let users = [];

// ✅ Register endpoint
app.post("/api/register", (req, res) => {
  const { name, phone, email, gender } = req.body;
  if (!name || !phone || !email || !gender) {
    return res.status(400).json({ message: "All fields required" });
  }
  users.push({ name, phone, email, gender });
  res.json({ message: "User registered successfully", user: { name, phone, email, gender } });
});

// ✅ Login endpoint
app.post("/api/login", (req, res) => {
  const { email, phone } = req.body;
  const user = users.find((u) => u.email === email && u.phone === phone);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  res.json({ message: "Login successful", user });
});

// ✅ Fake call trigger
app.post("/api/fakecall", (req, res) => {
  res.json({ message: "Fake call triggered!", data: req.body });
});

// ✅ Filter alerts endpoint
app.post("/api/alerts/filter", (req, res) => {
  try {
    const { startDate, endDate, location, status, severity } = req.body;
    
    console.log("🔍 [FILTER REQUEST] Received filter params:", {
      startDate,
      endDate,
      location,
      status,
      severity,
    });

    // Validate at least one filter is provided
    if (!startDate && !endDate && !location && !status && !severity) {
      console.warn("⚠️  [FILTER] No filter parameters provided");
      return res.status(400).json({
        success: false,
        message: "At least one filter parameter required",
      });
    }

    // TODO: Connect to Firestore for real data filtering
    // For now, returning mock response to confirm endpoint works
    const mockFilters = {
      startDate,
      endDate,
      location,
      status,
      severity,
    };

    console.log("✅ [FILTER SUCCESS] Filters processed successfully");
    console.log("📊 [FILTER] Mock data structure:", mockFilters);

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
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  console.log(`🚀 Access from Android Emulator: http://10.0.2.2:${PORT}`);
  console.log(`🚀 Access from localhost: http://localhost:${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   - POST /api/register`);
  console.log(`   - POST /api/login`);
  console.log(`   - POST /api/fakecall`);
  console.log(`   - POST /api/alerts/filter (NEW)`);
});
