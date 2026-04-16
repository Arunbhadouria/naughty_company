const express = require("express");
const router = express.Router();
const analyzerService = require("../services/analyzer.service");
const usageTracker = require("../middleware/usage.middleware");

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
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
