const User = require("../models/User");
const { generateToken, sendTokenResponse } = require("../utils/token.utils");
const analyzerService = require("../services/analyzer.service");

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    // Create user
    const user = await User.create({
      email,
      password,
      displayName,
    });

    // Check if there was a pending free scan from the cookie
    const pendingScan = req.cookies && req.cookies.pending_scan_data;
    if (pendingScan) {
      try {
        const { query } = JSON.parse(pendingScan);
        if (query) {
          console.log(`[Auth] Recovering pending scan for query: ${query}`);
          const result = await analyzerService.analyze(query);
          user.scanHistory.push({
            query,
            result,
            timestamp: new Date(),
          });
          user.scanCount += 1;
          await user.save();
        }
        res.clearCookie("pending_scan_data");
        res.clearCookie("naughty_freebie_used");
      } catch (e) {
        console.error("Failed to recover pending scan data:", e.message);
      }
    }

    const token = generateToken(user._id);
    sendTokenResponse(res, 201, token);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: "Please provide an email and password" },
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid credentials" },
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid credentials" },
      });
    }

    const token = generateToken(user._id);
    sendTokenResponse(res, 200, token);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Check current user status (useful for frontend load)
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Log user out / clear cookie
 * @route   GET /api/v1/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};
