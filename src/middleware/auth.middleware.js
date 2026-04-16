const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect routes - ensures user is logged in via JWT
 */
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token || token === "none") {
    return res.status(401).json({
      success: false,
      error: { message: "Not authorized to access this route" },
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: "User not found" },
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { message: "Not authorized to access this route" },
    });
  }
};
