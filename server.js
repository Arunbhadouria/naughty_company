require("dotenv").config();
const app = require("./src/app");
const sentimentService = require("./src/services/sentiment.service");

const PORT = process.env.PORT || 3000;

/**
 * Initialize services and start server
 */
async function startServer() {
  try {
    console.log("🚀 Starting Naughty Company Backend...");
    
    // Connect to Database
    const connectDB = require("./src/config/db");
    await connectDB();
    console.log("📂 Database connected.");

    // Warm up the ML model
    console.log("🧠 Loading sentiment model...");
    sentimentService.load();
    console.log("✅ Model loaded successfully.");

    app.listen(PORT, () => {
      console.log(`📡 Server listening on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
