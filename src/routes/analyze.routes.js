const express = require("express");
const router = express.Router();
const analyzerService = require("../services/analyzer.service");
const usageTracker = require("../middleware/usage.middleware");
const User = require("../models/User");
const { protect } = require("../middleware/auth.middleware");

/**
 * GET /api/v1/analyze/:id
 * Retrieves a specific scan from user history.
 */
router.get("/:id", protect, async (req, res, next) => {
  try {
    const scan = req.user.scanHistory.id(req.params.id);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: { message: "Scan record not found in your archives." }
      });
    }
    res.json({
      success: true,
      data: scan.result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/analyze
 * Analyzes a company or domain.
 */
router.post("/", usageTracker, async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: { message: "Query parameter is required and must be at least 2 characters long." }
      });
    }

    const result = await analyzerService.analyze(query);

    // If user is logged in, save to history
    if (req.user) {
      req.user.scanHistory.push({
        query,
        result,
        timestamp: new Date()
      });
      req.user.scanCount += 1;
      await req.user.save();
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
