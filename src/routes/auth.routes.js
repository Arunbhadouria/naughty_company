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
  (req, res) => {
    // On success, we set the token cookie and redirect
    const { generateToken, sendTokenResponse } = require("../utils/token.utils");
    const token = generateToken(req.user._id);
    
    // For OAuth we usually redirect to the frontend with the token or set cookie and redirect
    sendTokenResponse(res, 200, token);
    // Ideally: res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  }
);

module.exports = router;
