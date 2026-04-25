const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const errorHandler = require("./middleware/errorHandler");
const apiLimiter = require("./middleware/rateLimiter");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");

// Passport config
require("./config/passport")(passport);

// Route imports
const healthRoutes = require("./routes/health.routes");
const analyzeRoutes = require("./routes/analyze.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

// ─── MIDDLEWARE ─────────────────────────────────────────

// Security headers - Relaxed for OAuth redirects
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // In production, you should configure this properly
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Request logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// ─── ROUTES ────────────────────────────────────────────

// Version 1 of the API
const API_PREFIX = "/api/v1";

app.use(`${API_PREFIX}/health`, healthRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/analyze`, apiLimiter, analyzeRoutes);
app.use(`${API_PREFIX}/feedback`, feedbackRoutes);

// ─── ERROR HANDLING ────────────────────────────────────

app.use(errorHandler);

module.exports = app;
