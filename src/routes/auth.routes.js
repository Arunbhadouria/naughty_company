const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

// Passport for OAuth
const passport = require("passport");

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", protect, getMe);

// OAuth Routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  async (req, res) => {
    // On success, we set the token cookie and redirect
    const { generateToken } = require("../utils/token.utils");
    const analyzerService = require("../services/analyzer.service");
    const token = generateToken(req.user._id);

    // Scan Recovery Logic for OAuth users
    const pendingScan = req.cookies && req.cookies.pending_scan_data;
    if (pendingScan) {
      try {
        const { query } = JSON.parse(pendingScan);
        if (query) {
          const result = await analyzerService.analyze(query);
          req.user.scanHistory.push({
            query,
            result,
            timestamp: new Date(),
          });
          req.user.scanCount += 1;
          await req.user.save();
        }
      } catch (e) {
        console.error("OAuth Scan Recovery Failed:", e.message);
      }
    }

    // Set cookie and redirect to frontend
    const options = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    };

    res.cookie("token", token, options);
    res.clearCookie("pending_scan_data");
    res.clearCookie("naughty_freebie_used");
    res.redirect(process.env.FRONTEND_URL || "http://localhost:5173");
  }
);

module.exports = router;
