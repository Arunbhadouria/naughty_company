const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Tracks usage for anonymous users and allows only one free scan.
 * If user is logged in, this middleware just passes through.
 */
const usageTracker = async (req, res, next) => {
  let token;

  // Check if user is logged in
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token && token !== "none") {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
      if (req.user) {
        return next(); // User is logged in, bypass freebie check
      }
    } catch (err) {
      // Invalid token, treat as anonymous
    }
  }

  // Anonymous User Logic
  const freebieUsed = req.cookies && req.cookies.naughty_freebie_used;

  if (freebieUsed) {
    return res.status(403).json({
      success: false,
      error: {
        message: "You have used your free scan. Please register or log in to continue.",
        code: "LOGIN_REQUIRED",
      },
    });
  }

  // Allow the scan, but prepare to set the cookie on success
  const originalJson = res.json;
  res.json = function (data) {
    if (data.success && data.data) {
      // Set the "freebie used" cookie
      res.cookie("naughty_freebie_used", "true", {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
      });

      // Also store the scan data in a temporary cookie so it can be recovered upon registration
      const scanData = {
        query: req.body.query,
        timestamp: new Date(),
      };
      res.cookie("pending_scan_data", JSON.stringify(scanData), {
        maxAge: 1 * 60 * 60 * 1000, // 1 hour
        httpOnly: true,
      });
    }
    return originalJson.call(this, data);
  };

  next();
};

module.exports = usageTracker;
